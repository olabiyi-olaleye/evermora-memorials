-- Evermora RLS tests — platform-admin moderation surface (Phase 5M)
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

-- Fixtures (seed): a0..ff is a platform admin; a0..01 (owner) is not staff.
--   e1 published + public; e1 has one open 'inaccurate' report + a seeded service request.

-- ---- reports: staff-only reads + updates ---------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');  -- owner, not staff
select is(
  (select count(*)::int from reports where memorial_id = 'e1000000-0000-4000-a000-000000000001'),
  1, 'a memorial admin sees reports against their own memorial');
update reports set status = 'dismissed'
  where memorial_id = 'e1000000-0000-4000-a000-000000000001';
select is(
  (select count(*)::int from reports
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and status = 'dismissed'),
  0, 'a non-staff user CANNOT resolve a report (update policy excludes the row)');

select pg_temp.login_as('a0000000-0000-4000-a000-0000000000ff');  -- platform admin
select ok(
  (select count(*)::int from reports) >= 1,
  'platform staff can read every report');
select lives_ok(
  $$ update reports set status = 'reviewing'
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' $$,
  'platform staff CAN move a report to reviewing');
select lives_ok(
  $$ update reports set status = 'dismissed', resolved_by = auth.uid(), resolved_at = now(),
       resolution_note = 'checked'
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' $$,
  'platform staff CAN resolve a report');

-- ---- service_requests: staff-only base table ---------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');
select is(
  (select count(*)::int from service_requests),
  0, 'a non-staff user cannot read the service_requests base table');

select pg_temp.login_as('a0000000-0000-4000-a000-0000000000ff');
select ok(
  (select count(*)::int from service_requests) >= 1,
  'platform staff can read every service request');
select lives_ok(
  $$ update service_requests set status = 'in_review', assigned_to = auth.uid(),
       internal_notes = 'contacted'
     where contact_email = 'tunde.draft@example.test' $$,
  'platform staff CAN triage a service request');

-- ---- memorial suspension: platform admin only ------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');  -- owner
select throws_ok(
  $$ update memorials set status = 'suspended'
     where id = 'e1000000-0000-4000-a000-000000000001' $$,
  '42501', null,
  'a memorial owner CANNOT suspend their memorial');

select pg_temp.login_as('a0000000-0000-4000-a000-0000000000ff');  -- platform admin
select lives_ok(
  $$ update memorials set status = 'suspended', suspended_at = now(),
       suspended_reason = 'impersonation'
     where id = 'e1000000-0000-4000-a000-000000000001' $$,
  'platform staff CAN suspend a memorial');
select is(
  (select status::text from memorials where id = 'e1000000-0000-4000-a000-000000000001'),
  'suspended', 'the memorial is now suspended');

select * from finish();
rollback;
