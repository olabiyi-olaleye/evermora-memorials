-- Evermora RLS tests — notifications (Phase 5N)
begin;
select plan(9);

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

-- Fixtures (seed): a0..01 (owner) has 2 in_app rows; a0..02 (member) has 1 in_app
--   row; one email-channel row addressed to tunde.draft@example.test.
--   a0..ff is a platform admin.

-- ---- recipient-scoped reads --------------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');
select is(
  (select count(*)::int from notifications where recipient_profile_id <> 'a0000000-0000-4000-a000-000000000001'),
  0, 'a signed-in user sees only their own notifications');
select ok(
  (select count(*)::int from notifications) >= 2,
  'the owner sees their own notification rows');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');
select is(
  (select count(*)::int from notifications),
  1, 'the member sees exactly their own one row');

-- ---- recipient can mark their own row read -----------------------
select lives_ok(
  $$ update notifications set read_at = now()
     where recipient_profile_id = 'a0000000-0000-4000-a000-000000000002' $$,
  'a recipient CAN mark their own notification read');

-- ---- a recipient cannot touch someone else's row ----------------
update notifications set read_at = null
  where recipient_profile_id = 'a0000000-0000-4000-a000-000000000001';
select is(
  (select count(*)::int from notifications
     where recipient_profile_id = 'a0000000-0000-4000-a000-000000000001' and read_at is null),
  0, 'a user CANNOT clear another user''s notification (update policy excludes the row)');

-- ---- anon sees nothing -----------------------------------------
select pg_temp.logout();
select throws_ok(
  $$ select count(*) from notifications $$,
  '42501', null,
  'an anonymous visitor has no access to notifications at all');

-- ---- platform staff can read every row ------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-0000000000ff');
select ok(
  (select count(*)::int from notifications) >= 4,
  'platform staff can read every notification row');
select ok(
  (select count(*)::int from notifications where channel = 'email') >= 1,
  'the email-channel row is visible to staff for the delivery worker');

-- ---- authenticated has no INSERT ------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');
select throws_ok(
  $$ insert into notifications (recipient_profile_id, event_type, channel, payload)
     values ('a0000000-0000-4000-a000-000000000001', 'tribute_submitted', 'in_app', '{}') $$,
  '42501', null,
  'a signed-in user CANNOT insert a notification directly');

select * from finish();
rollback;
