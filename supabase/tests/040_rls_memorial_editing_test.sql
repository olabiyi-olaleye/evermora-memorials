-- Evermora RLS tests — memorial profile / privacy / feature-settings editing
-- (Phase 5C). Confirms the DB is the final boundary for the edit operations.
begin;
select plan(9);

create or replace function pg_temp.login_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
end $$;

-- Fixtures (supabase/seed.sql), memorial e1:
--   a0..01 owner, a0..02 content_editor, a0..03 tribute_moderator, a0..04 stranger

-- ---- memorials profile fields (memorial.edit) ----------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');  -- owner
select lives_ok(
  $$ update memorials set headline = 'Teacher, gardener, grandmother'
     where id = 'e1000000-0000-4000-a000-000000000001' $$,
  'owner CAN edit memorial profile fields');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');  -- content_editor
select lives_ok(
  $$ update memorials set biography_summary = 'A short life summary.'
     where id = 'e1000000-0000-4000-a000-000000000001' $$,
  'content_editor CAN edit memorial profile fields');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000003');  -- tribute_moderator
update memorials set headline = 'nope'
  where id = 'e1000000-0000-4000-a000-000000000001';
select is(
  (select count(*)::int from memorials
     where id = 'e1000000-0000-4000-a000-000000000001' and headline = 'nope'),
  0, 'tribute_moderator CANNOT edit memorial profile fields');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000004');  -- stranger
update memorials set headline = 'hijacked'
  where id = 'e1000000-0000-4000-a000-000000000001';
select is(
  (select count(*)::int from memorials
     where id = 'e1000000-0000-4000-a000-000000000001' and headline = 'hijacked'),
  0, 'a stranger CANNOT edit memorial profile fields');

-- ---- feature_settings (memorial.edit) -----------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');  -- content_editor
select lives_ok(
  $$ update feature_settings set candles_enabled = false
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' $$,
  'content_editor CAN update feature_settings (memorial.edit)');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000003');  -- tribute_moderator
update feature_settings set tributes_enabled = false
  where memorial_id = 'e1000000-0000-4000-a000-000000000001';
select is(
  (select tributes_enabled from feature_settings
     where memorial_id = 'e1000000-0000-4000-a000-000000000001'),
  true, 'tribute_moderator CANNOT update feature_settings');

-- ---- privacy_settings (privacy.manage — owner/admin only) --------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');  -- owner
select lives_ok(
  $$ update privacy_settings set visibility = 'anyone_with_link'
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' $$,
  'owner CAN update privacy_settings (privacy.manage)');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');  -- content_editor
update privacy_settings set visibility = 'public'
  where memorial_id = 'e1000000-0000-4000-a000-000000000001';
select is(
  (select visibility from privacy_settings
     where memorial_id = 'e1000000-0000-4000-a000-000000000001'),
  'anyone_with_link', 'content_editor CANNOT update privacy_settings (lacks privacy.manage)');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000004');  -- stranger
update privacy_settings set visibility = 'public'
  where memorial_id = 'e1000000-0000-4000-a000-000000000001';
select is(
  (select visibility from privacy_settings
     where memorial_id = 'e1000000-0000-4000-a000-000000000001'),
  'anyone_with_link', 'a stranger CANNOT update privacy_settings');

select * from finish();
rollback;
