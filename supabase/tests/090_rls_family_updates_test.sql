-- Evermora RLS tests — family updates: write permission, per-update visibility (Phase 5I)
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

-- Fixtures (seed): e1 published + public, updates_visibility = 'inherit' (default).
--   a0..01 owner, a0..02 content_editor (HAS updates.publish), a0..03 tribute_moderator, a0..04 stranger.
--   e1 updates: 1 published/public, 1 published/members, 1 draft/inherit.
--   e2 draft + private.

-- ---- write permission (updates.publish) -------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');  -- content_editor
select lives_ok(
  $$ insert into family_updates (memorial_id, title, body, status)
     values ('e1000000-0000-4000-a000-000000000001','Editor note','Text.','draft') $$,
  'content_editor CAN add a family update');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000003');  -- tribute_moderator
select throws_ok(
  $$ insert into family_updates (memorial_id, title, body)
     values ('e1000000-0000-4000-a000-000000000001','Nope','x') $$,
  '42501', null,
  'tribute_moderator CANNOT add a family update');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000004');  -- stranger
select throws_ok(
  $$ insert into family_updates (memorial_id, title, body)
     values ('e1000000-0000-4000-a000-000000000001','Nope','x') $$,
  '42501', null,
  'stranger CANNOT add a family update');

-- ---- per-update visibility: anon -------------------------------------
select pg_temp.logout();
select is(
  (select count(*)::int from family_updates
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and status = 'published'
       and visibility in ('inherit','public')),
  1, 'anon CAN read a published public/inherit family update');
select is(
  (select count(*)::int from family_updates
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and status = 'draft'),
  0, 'anon CANNOT read a draft family update');
select is(
  (select count(*)::int from family_updates
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and visibility = 'members'),
  0, 'anon CANNOT read a members-only family update even when published');
select is(
  (select count(*)::int from family_updates where memorial_id = 'e2000000-0000-4000-a000-000000000002'),
  0, 'anon CANNOT read family updates of a private/draft memorial');

-- ---- members see everything ----------------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000003');  -- active member
select ok(
  (select count(*)::int from family_updates
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and deleted_at is null) >= 3,
  'an active member sees draft + members-only + public family updates');

-- ---- publish check constraint -------------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');  -- owner
select throws_ok(
  $$ update family_updates set status = 'published'
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and title = 'Editor note' $$,
  '23514', null,
  'a family update cannot be published without published_at (check constraint)');
select lives_ok(
  $$ update family_updates set status = 'published', published_at = now()
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and title = 'Draft: order of service' $$,
  'owner CAN publish a draft family update');

select * from finish();
rollback;
