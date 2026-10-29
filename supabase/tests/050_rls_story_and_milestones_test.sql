-- Evermora RLS tests — story sections & milestones (Phase 5E)
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

-- Fixtures (seed): memorial e1 is published + public, story_visibility = 'public'.
--   a0..01 owner, a0..02 content_editor, a0..03 tribute_moderator, a0..04 stranger
--   e1 has published story sections + published & draft milestones.

-- ---- story_sections: write permission (story.edit) ----------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');  -- content_editor HAS story.edit
select lives_ok(
  $$ insert into story_sections (memorial_id, kind, title, body, status)
     values ('e1000000-0000-4000-a000-000000000001','custom','Added by editor','Text.','draft') $$,
  'content_editor CAN add a story section');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000003');  -- tribute_moderator lacks story.edit
select throws_ok(
  $$ insert into story_sections (memorial_id, kind, title, body)
     values ('e1000000-0000-4000-a000-000000000001','custom','Nope','x') $$,
  '42501');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000004');  -- stranger
select throws_ok(
  $$ insert into story_sections (memorial_id, kind, title, body)
     values ('e1000000-0000-4000-a000-000000000001','custom','Nope','x') $$,
  '42501');

-- ---- milestones: same write rule ---------------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');  -- content_editor
select lives_ok(
  $$ insert into milestones (memorial_id, year, title, status)
     values ('e1000000-0000-4000-a000-000000000001', 1999, 'Editor milestone', 'draft') $$,
  'content_editor CAN add a milestone');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000004');  -- stranger
select throws_ok(
  $$ insert into milestones (memorial_id, year, title)
     values ('e1000000-0000-4000-a000-000000000001', 2001, 'nope') $$,
  '42501');

-- ---- public visibility: anon sees published, not draft ----------------
select pg_temp.logout();
select ok(
  (select count(*)::int from milestones
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and status = 'published') >= 1,
  'anon CAN read published milestones on a public memorial (story section)');
select is(
  (select count(*)::int from milestones
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and status = 'draft'),
  0, 'anon CANNOT read draft milestones');
select is(
  (select count(*)::int from story_sections
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and status = 'draft'),
  0, 'anon CANNOT read draft story sections');

-- ---- private memorial: anon sees nothing -----------------------------
select is(
  (select count(*)::int from milestones where memorial_id = 'e2000000-0000-4000-a000-000000000002'),
  0, 'anon CANNOT read milestones of a private/draft memorial');
select is(
  (select count(*)::int from story_sections where memorial_id = 'e2000000-0000-4000-a000-000000000002'),
  0, 'anon CANNOT read story sections of a private/draft memorial');

select * from finish();
rollback;
