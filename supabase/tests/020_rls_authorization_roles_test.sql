-- Evermora RLS tests — role -> permission enforcement
begin;
select plan(15);

create or replace function pg_temp.login_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
end $$;

-- Fixtures:
--   a0..01 owner, a0..02 content_editor, a0..03 tribute_moderator on e1...

-- ---- permission matrix (app.has_memorial_permission) ----------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');  -- content_editor
select ok(app.has_memorial_permission('e1000000-0000-4000-a000-000000000001','story.edit'),
  'content_editor HAS story.edit');
select ok(app.has_memorial_permission('e1000000-0000-4000-a000-000000000001','gallery.manage'),
  'content_editor HAS gallery.manage');
select ok(not app.has_memorial_permission('e1000000-0000-4000-a000-000000000001','tributes.moderate'),
  'content_editor does NOT have tributes.moderate');
select ok(not app.has_memorial_permission('e1000000-0000-4000-a000-000000000001','admins.manage'),
  'content_editor does NOT have admins.manage');
select ok(not app.has_memorial_permission('e1000000-0000-4000-a000-000000000001','memorial.delete'),
  'content_editor does NOT have memorial.delete (owner-only)');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000003');  -- tribute_moderator
select ok(app.has_memorial_permission('e1000000-0000-4000-a000-000000000001','tributes.moderate'),
  'tribute_moderator HAS tributes.moderate');
select ok(not app.has_memorial_permission('e1000000-0000-4000-a000-000000000001','story.edit'),
  'tribute_moderator does NOT have story.edit');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');  -- owner
select ok(app.has_memorial_permission('e1000000-0000-4000-a000-000000000001','memorial.delete'),
  'owner HAS memorial.delete');
select ok(app.has_memorial_permission('e1000000-0000-4000-a000-000000000001','billing.manage'),
  'owner HAS billing.manage');

-- ---- enforced through RLS on real tables ----------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');  -- content_editor
update tributes set status = 'approved'
  where memorial_id = 'e1000000-0000-4000-a000-000000000001' and status = 'pending';
select is(
  (select count(*)::int from tributes
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and status = 'approved'),
  6, 'content_editor CANNOT approve a pending tribute (still just the 6 seeded approved)');

select lives_ok(
  $$ update story_sections set title = 'Her life (edited)'
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and kind = 'biography' $$,
  'content_editor CAN edit a story section');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000003');  -- tribute_moderator
select lives_ok(
  $$ update tributes set status = 'approved', moderated_at = now(), published_at = now()
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and status = 'pending' $$,
  'tribute_moderator CAN approve a pending tribute');
update story_sections set title = 'nope'
  where memorial_id = 'e1000000-0000-4000-a000-000000000001' and kind = 'faith';
select is(
  (select count(*)::int from story_sections where title = 'nope'),
  0, 'tribute_moderator CANNOT edit a story section');

-- ---- ownership is protected -------------------------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');  -- content_editor
select throws_ok(
  $$ insert into memorial_memberships (memorial_id, profile_id, role, status)
     values ('e1000000-0000-4000-a000-000000000001','a0000000-0000-4000-a000-000000000004','owner','active') $$,
  '42501');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');  -- owner
select throws_ok(
  $$ delete from memorial_memberships
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and role = 'owner' and status = 'active' $$,
  '42501');

select * from finish();
rollback;
