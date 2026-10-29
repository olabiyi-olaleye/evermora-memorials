-- Evermora RLS tests — anonymous visitor writes, privacy boundaries, audit
begin;
select plan(12);

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

-- ---- anonymous tribute submission ----------------------------------------
select pg_temp.logout();

select lives_ok(
  $$ insert into tributes (memorial_id, author_display_name, message)
     values ('e1000000-0000-4000-a000-000000000001','A Visitor','A gentle memory.') $$,
  'anon CAN submit a pending tribute to a memorial that accepts tributes');

select throws_ok(
  $$ insert into tributes (memorial_id, status, author_display_name, message)
     values ('e1000000-0000-4000-a000-000000000001','approved','Sneaky','pre-approved') $$,
  '42501', null,
  'anon CANNOT self-approve a tribute');

select throws_ok(
  $$ insert into tributes (memorial_id, author_display_name, message)
     values ('e2000000-0000-4000-a000-000000000002','Visitor','on a private draft') $$,
  '42501', null,
  'anon CANNOT submit a tribute to a private/draft memorial');

select lives_ok(
  $$ insert into remembrance_actions (memorial_id, action_type, visitor_display_name, visitor_session)
     values ('e1000000-0000-4000-a000-000000000001','candle','Visitor','sess-test-1') $$,
  'anon CAN leave a remembrance gesture');

select lives_ok(
  $$ insert into reports (memorial_id, reason, details)
     values ('e1000000-0000-4000-a000-000000000001','inaccurate','A date looks wrong.') $$,
  'anon CAN file a report');

select lives_ok(
  $$ insert into service_requests (contact_name, contact_email, service_type, details)
     values ('Visitor','visitor@example.test','printing','Need 200 programmes.') $$,
  'anon CAN submit a service request');

-- ---- privacy: private columns never exposed to the Data API --------------
select throws_ok(
  $$ select count(*) from reports $$,
  '42501');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000004');  -- owner of e2 only
select is(
  (select count(*)::int from service_requests where memorial_id is null
     and contact_email <> 'tunde.draft@example.test'),
  0, 'a non-staff user CANNOT read other people''s service requests');

select is(
  (select count(*)::int from audit_logs where memorial_id = 'e1000000-0000-4000-a000-000000000001'),
  0, 'a user with no admin role on a memorial CANNOT read its audit logs');

-- ---- audit trail is written by triggers ----------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');  -- owner of e1
select ok(
  (select count(*)::int from audit_logs where memorial_id = 'e1000000-0000-4000-a000-000000000001') >= 1,
  'owner CAN read their own memorial''s audit trail');

update memorials set status = 'archived', archived_at = now()
  where id = 'e1000000-0000-4000-a000-000000000001';
select ok(
  (select count(*) > 0 from audit_logs
     where memorial_id = 'e1000000-0000-4000-a000-000000000001'
       and action = 'memorial.status_changed'),
  'changing memorial status writes an audit_logs row via trigger');

-- ---- platform admin ------------------------------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-0000000000ff');  -- staff
select ok(
  (select count(*) >= 1 from service_requests),
  'platform admin CAN read service requests');

select * from finish();
rollback;
