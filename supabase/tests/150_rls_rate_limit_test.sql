-- Evermora RLS tests — anon per-IP rate-limit RPCs (Phase 5O)
begin;
select plan(6);

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

-- ---- the count RPCs are anon-callable, and return only a bare count -----
select pg_temp.logout();
select lives_ok(
  $$ select public.recent_reports_from_ip('203.0.113.50'::inet, now() - interval '1 hour') $$,
  'anon CAN call recent_reports_from_ip (returns a bare count)');
select is(
  (select public.recent_reports_from_ip('203.0.113.50'::inet, now() - interval '1 hour')),
  0, 'a fresh IP has 0 recent reports');
select lives_ok(
  $$ select public.recent_service_requests_from_ip('203.0.113.51'::inet, now() - interval '1 hour') $$,
  'anon CAN call recent_service_requests_from_ip (returns a bare count)');
select is(
  (select public.recent_service_requests_from_ip('203.0.113.51'::inet, now() - interval '1 hour')),
  0, 'a fresh IP has 0 recent service requests');

-- ---- anon cannot read submitted_ip (or anything else) directly ----------
select throws_ok(
  $$ select submitted_ip from reports limit 1 $$,
  '42501', null,
  'anon CANNOT select reports.submitted_ip directly — no anon select policy on reports');
select throws_ok(
  $$ select submitted_ip from service_requests limit 1 $$,
  '42501', null,
  'anon CANNOT select service_requests.submitted_ip directly — no anon select policy on service_requests');

select * from finish();
rollback;
