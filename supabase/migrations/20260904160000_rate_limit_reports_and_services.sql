-- Evermora — Phase 5O (privacy/security hardening)
--
-- `reports` and `service_requests` accept anonymous writes but, unlike
-- `tributes`, never captured a submitter IP — so there was no per-IP abuse
-- throttle on either path. This mirrors the `tributes` pattern
-- (`…_tributes_auto_approve.sql`): a `submitted_ip` column, never exposed to
-- `anon` or a public view, plus a SECURITY DEFINER function that returns only
-- a bare count so `anon` can rate-limit itself without reading anyone's IP or
-- content. `reports.submitted_ip` is visible to the same *authenticated*
-- readers who already see `reporter_email` (the reporter, staff, the
-- memorial's own `admins.manage` holders) — it does not need a stronger
-- guarantee than a column those readers already have.
--
-- `reports` has no per-memorial rate limit — a report can arrive with no
-- `tribute_id`/some future `reportMemorial` flow, and the safety valve should
-- work regardless of which memorial is involved. `service_requests.memorial_id`
-- is nullable for the same reason (an enquiry can precede a memorial). Both
-- are therefore counted **globally per IP**, not per memorial.

alter table reports add column submitted_ip inet;
alter table service_requests add column submitted_ip inet;

comment on column reports.submitted_ip is
  'For the anon per-IP rate-limit count only. Visible via reports_select to the same readers who already see reporter_email — the reporter, platform staff, and the memorial''s own admins.manage holders — never to anon, an ordinary member, or a public view.';
comment on column service_requests.submitted_ip is
  'For the anon per-IP rate-limit count only. The service_requests base table is staff/assignee-only (reports_select-equivalent), and my_service_requests never selects it — the requester cannot see their own submitted_ip.';

create or replace function public.recent_reports_from_ip(
  from_ip inet, since timestamptz
)
returns integer
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select count(*)::int
  from public.reports
  where submitted_ip = from_ip
    and created_at >= since;
$$;

comment on function public.recent_reports_from_ip(inet, timestamptz) is
  'Count of reports from an IP since a time, across all memorials. SECURITY DEFINER — returns a bare count so the anon rate limit works without granting SELECT on reports.';

grant execute on function public.recent_reports_from_ip(inet, timestamptz) to anon, authenticated;

create or replace function public.recent_service_requests_from_ip(
  from_ip inet, since timestamptz
)
returns integer
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select count(*)::int
  from public.service_requests
  where submitted_ip = from_ip
    and created_at >= since;
$$;

comment on function public.recent_service_requests_from_ip(inet, timestamptz) is
  'Count of service requests from an IP since a time. SECURITY DEFINER — returns a bare count so the anon rate limit works without granting SELECT on service_requests.';

grant execute on function public.recent_service_requests_from_ip(inet, timestamptz) to anon, authenticated;
