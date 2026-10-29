-- Evermora — anonymous tribute self-edit (edit_token + the two SECURITY
-- DEFINER functions that carry it). RLS/domain-level tests; the length /
-- sanitisation / autoApprove decision itself lives in editTribute (TS).
begin;
select plan(10);

create or replace function pg_temp.login_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
end $$;
create or replace function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
end $$;

-- Test-orchestration only (not exercising RLS itself): read the base table as
-- the underlying test-runner role, independent of whatever `role` the anon /
-- login_as helpers above have simulated — anon has no SELECT grant on
-- `tributes` at all (the fixture insert/moderate below prove the real paths).
create or replace function pg_temp.tribute_row(name_ text)
returns tributes language sql security definer as $$
  select * from tributes where author_display_name = name_;
$$;

-- Fixture: a fresh anon-submitted tribute on the seeded published memorial.
select pg_temp.logout();
insert into tributes (memorial_id, author_display_name, message)
values ('e1000000-0000-4000-a000-000000000001', 'Edit Me', 'Original message.');

select ok(
  (select edit_token is not null from pg_temp.tribute_row('Edit Me')),
  'a new tribute gets an edit_token'
);

-- resolve_tribute_edit_token — anon can read its own tribute by token.
select pg_temp.logout();
select is(
  (select author_display_name from public.resolve_tribute_edit_token(
    (select edit_token from pg_temp.tribute_row('Edit Me'))
  )),
  'Edit Me',
  'resolve_tribute_edit_token returns the matching tribute for anon'
);

select is(
  (select count(*)::int from public.resolve_tribute_edit_token('00000000-0000-0000-0000-000000000000'::uuid)),
  0,
  'resolve_tribute_edit_token returns nothing for an unknown token'
);

select ok(
  (select created_at is not null from public.resolve_tribute_edit_token(
    (select edit_token from pg_temp.tribute_row('Edit Me'))
  )),
  'resolve_tribute_edit_token also returns created_at, for displaying it alongside others'
);

-- A moderator approves it first, so the edit can prove moderation stamps get cleared.
select pg_temp.login_as('a0000000-0000-4000-a000-000000000003'); -- tribute_moderator
update tributes
set status = 'approved', moderated_by = 'a0000000-0000-4000-a000-000000000003',
    moderated_at = now(), moderation_note = 'looked fine', published_at = now()
where author_display_name = 'Edit Me';

-- apply_tribute_edit — anon, proven only by the token, edits it back to pending.
select pg_temp.logout();
select is(
  (select status::text from public.apply_tribute_edit(
    (select edit_token from pg_temp.tribute_row('Edit Me')),
    'Edited Name', 'A cousin', 'Edited message.', 'pending'
  )),
  'pending',
  'apply_tribute_edit updates the status as instructed by the caller'
);

select is(
  (select message from pg_temp.tribute_row('Edited Name')),
  'Edited message.',
  'apply_tribute_edit persists the new content'
);

select is(
  (select moderated_by from pg_temp.tribute_row('Edited Name')),
  null,
  'apply_tribute_edit clears the prior moderator stamp'
);

select is(
  (select moderation_note from pg_temp.tribute_row('Edited Name')),
  null,
  'apply_tribute_edit clears the prior moderation note'
);

select is(
  (select count(*)::int from public.apply_tribute_edit(
    '00000000-0000-0000-0000-000000000000'::uuid, 'X', null, 'y', 'pending'
  )),
  0,
  'apply_tribute_edit is a no-op for an unknown token'
);

-- The public, anon-readable projection never carries the token.
select is(
  (select count(*)::int from information_schema.columns
   where table_name = 'public_tributes' and column_name = 'edit_token'),
  0,
  'public_tributes never exposes edit_token'
);

select * from finish();
rollback;
