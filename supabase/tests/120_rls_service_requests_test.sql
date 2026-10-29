-- Evermora RLS tests — service requests: public insert, staff-only base reads,
-- requester projection (Phase 5L)
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

-- ---- anon can submit a clean 'new' enquiry ------------------------
select pg_temp.logout();
select lives_ok(
  $$ insert into service_requests (contact_name, contact_email, service_type)
     values ('A Visitor', 'visitor@example.test', 'printing') $$,
  'anon CAN submit a service request');

select throws_ok(
  $$ insert into service_requests (contact_name, contact_email, service_type, status)
     values ('Sneaky', 's@example.test', 'other', 'scheduled') $$,
  '42501', null,
  'anon CANNOT pre-set a non-new status');
select throws_ok(
  $$ insert into service_requests (contact_name, contact_email, internal_notes)
     values ('Sneaky', 's@example.test', 'notes') $$,
  '42501', null,
  'anon CANNOT set internal_notes on submission');
select throws_ok(
  $$ insert into service_requests (contact_name, contact_email, assigned_to)
     values ('Sneaky', 's@example.test', 'a0000000-0000-4000-a000-000000000001') $$,
  '42501', null,
  'anon CANNOT self-assign');

-- ---- base table is staff-only ----------------------------------
select throws_ok(
  $$ select count(*) from service_requests $$,
  '42501', null,
  'anon has no direct read on service_requests');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');  -- a normal family user, not staff
select is(
  (select count(*)::int from service_requests),
  0, 'a non-staff user cannot read the service_requests base table');

-- ---- requester projection -------------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');
insert into service_requests (contact_name, contact_email, service_type, requested_by)
values ('Ada', 'ada@example.test', 'catering', 'a0000000-0000-4000-a000-000000000001');
select is(
  (select count(*)::int from my_service_requests
     where contact_email = 'ada@example.test'),
  1, 'the requester CAN see their own request via my_service_requests');
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_name = 'my_service_requests' and column_name in ('internal_notes', 'assigned_to')
  ),
  'my_service_requests never exposes internal_notes / assigned_to');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');  -- a different user
select is(
  (select count(*)::int from my_service_requests where contact_email = 'ada@example.test'),
  0, 'another user does NOT see someone else''s request');

select * from finish();
rollback;
