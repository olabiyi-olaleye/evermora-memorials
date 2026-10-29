-- Evermora RLS tests — tributes: submission, auto-approve, moderation (Phase 5G)
begin;
select plan(11);

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

-- Fixtures (seed): e1 published + public, tributes_enabled = true,
-- tribute_moderation_enabled = true (defaults). e2 draft + private.
--   a0..02 content_editor (NO tributes.moderate), a0..03 tribute_moderator

-- ---- anon submission ---------------------------------------------------
select pg_temp.logout();
select lives_ok(
  $$ insert into tributes (memorial_id, author_display_name, message)
     values ('e1000000-0000-4000-a000-000000000001','A Visitor','A gentle memory.') $$,
  'anon CAN submit a pending tribute');

select throws_ok(
  $$ insert into tributes (memorial_id, status, published_at, author_display_name, message)
     values ('e1000000-0000-4000-a000-000000000001','approved', now(),'Sneaky','pre-approved') $$,
  '42501', null,
  'anon CANNOT self-approve while moderation is ON');

select throws_ok(
  $$ insert into tributes (memorial_id, moderated_by, author_display_name, message)
     values ('e1000000-0000-4000-a000-000000000001','a0000000-0000-4000-a000-000000000003','X','y') $$,
  '42501', null,
  'anon CANNOT set moderated_by on submission');

select throws_ok(
  $$ insert into tributes (memorial_id, author_display_name, message)
     values ('e2000000-0000-4000-a000-000000000002','Visitor','on a private draft') $$,
  '42501', null,
  'anon CANNOT submit to a private/draft memorial');

-- ---- §37 auto-approve when moderation is OFF --------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');  -- owner
update feature_settings set tribute_moderation_enabled = false
  where memorial_id = 'e1000000-0000-4000-a000-000000000001';

select pg_temp.logout();
select lives_ok(
  $$ insert into tributes (memorial_id, status, published_at, author_display_name, message)
     values ('e1000000-0000-4000-a000-000000000001','approved', now(),'Auto','Shown right away.') $$,
  'anon CAN insert an approved tribute when moderation is OFF (§37)');

select throws_ok(
  $$ insert into tributes (memorial_id, status, author_display_name, message)
     values ('e1000000-0000-4000-a000-000000000001','approved','Bad','no published_at') $$,
  '42501', null,
  'even with moderation OFF, an approved insert needs published_at');

-- restore
select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');
update feature_settings set tribute_moderation_enabled = true
  where memorial_id = 'e1000000-0000-4000-a000-000000000001';

-- ---- moderation permission ------------------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');  -- content_editor
update tributes set status = 'approved', published_at = now()
  where memorial_id = 'e1000000-0000-4000-a000-000000000001'
    and author_display_name = 'Anonymous Neighbour';
select is(
  (select status::text from tributes
     where memorial_id = 'e1000000-0000-4000-a000-000000000001'
       and author_display_name = 'Anonymous Neighbour'),
  'pending', 'content_editor (no tributes.moderate) CANNOT approve a pending tribute');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000003');  -- tribute_moderator
select lives_ok(
  $$ update tributes set status = 'approved', moderated_by = 'a0000000-0000-4000-a000-000000000003',
       moderated_at = now(), published_at = now()
     where memorial_id = 'e1000000-0000-4000-a000-000000000001'
       and author_display_name = 'Anonymous Neighbour' $$,
  'tribute_moderator CAN approve a pending tribute');

-- ---- public projection vs base table -------------------------------
select pg_temp.logout();
select throws_ok($$ select count(*) from tributes $$, '42501', null,
  'anon has NO privilege on the tributes base table');
select ok(
  (select count(*)::int from public_tributes where memorial_id = 'e1000000-0000-4000-a000-000000000001') >= 1,
  'anon CAN read approved tributes via the public_tributes view');

-- ---- rate-limit helper is callable as anon --------------------------
select is(
  public.recent_tributes_from_ip('e1000000-0000-4000-a000-000000000001'::uuid, '10.0.0.1'::inet, now() - interval '1 hour'),
  0, 'anon CAN call recent_tributes_from_ip (returns a bare count)');

select * from finish();
rollback;
