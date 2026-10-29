-- Evermora RLS tests — memorial & section visibility
-- Run with:  supabase test db   (expects the standard dev seed to be loaded)

begin;
select plan(14);

-- Fixtures from supabase/seed.sql
--   e1... = published, PUBLIC memorial "Josephine Adaeze Okafor"
--   e2... = draft, PRIVATE memorial "Emeka Daniel Balogun"
--   a0..01 = owner of e1 ; a0..04 = owner of e2 (unrelated to e1)

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

-- ---------------------------------------------------------------------------
-- Anonymous visitor
-- ---------------------------------------------------------------------------
select pg_temp.logout();

select is(
  (select count(*)::int from memorials where id = 'e1000000-0000-4000-a000-000000000001'),
  1, 'anon CAN see a published public memorial');

select is(
  (select count(*)::int from memorials where id = 'e2000000-0000-4000-a000-000000000002'),
  0, 'anon CANNOT see a draft memorial');

select is(
  (select count(*)::int from story_sections where memorial_id = 'e1000000-0000-4000-a000-000000000001'),
  2, 'anon sees only the 2 PUBLISHED story sections (not the draft one)');

select is(
  (select count(*)::int from memorial_people),
  0, 'anon CANNOT read memorial_people (family details are members-only)');

select is(
  (select count(*)::int from funeral_events where status <> 'published'),
  0, 'anon CANNOT read unpublished funeral events');

select throws_ok(
  $$ select count(*) from tributes $$,
  '42501');

select is(
  (select count(*)::int from public_tributes where memorial_id = 'e1000000-0000-4000-a000-000000000001'),
  6, 'anon CAN read approved tributes via the public_tributes view');

select is(
  (select count(*)::int from memorial_slugs where memorial_id = 'e2000000-0000-4000-a000-000000000002'),
  0, 'anon CANNOT resolve slugs of a private memorial');

select ok(
  (select bool_and(total >= 0) from remembrance_action_counts),
  'anon CAN read aggregate remembrance counts');

-- ---------------------------------------------------------------------------
-- Unrelated authenticated user (owner of e2, nothing on e1)
-- ---------------------------------------------------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000004');

select is(
  (select count(*)::int from memorials where id = 'e1000000-0000-4000-a000-000000000001'),
  1, 'unrelated user sees the published memorial (public content)');

select is(
  (select count(*)::int from memorial_people where memorial_id = 'e1000000-0000-4000-a000-000000000001'),
  0, 'unrelated user CANNOT read another memorial''s family details');

update memorials set headline = 'tampered' where id = 'e1000000-0000-4000-a000-000000000001';
select is(
  (select count(*)::int from memorials where headline = 'tampered'),
  0, 'unrelated user CANNOT update a memorial they have no role on');

-- ---------------------------------------------------------------------------
-- Owner of e1
-- ---------------------------------------------------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');

select is(
  (select count(*)::int from memorial_people where memorial_id = 'e1000000-0000-4000-a000-000000000001'),
  2, 'owner CAN read family details');

select lives_ok(
  $$ update memorials set headline = 'Teacher and matriarch.' where id = 'e1000000-0000-4000-a000-000000000001' $$,
  'owner CAN update their memorial');

select * from finish();
rollback;
