-- Evermora — Phase 2 data foundation
-- 0018 · reports
--
-- Abuse / accuracy / privacy reports raised against a memorial or a tribute.
-- Reportable by anyone (anonymous allowed). Reviewed by platform staff.

create table reports (
  id            uuid primary key default extensions.gen_random_uuid(),
  memorial_id   uuid references memorials (id) on delete set null,
  tribute_id    uuid references tributes (id) on delete set null,
  reporter_profile_id uuid references profiles (id) on delete set null,
  reporter_email citext,
  reason        report_reason not null default 'other',
  details       text,
  status        report_status not null default 'open',
  resolved_by   uuid references profiles (id) on delete set null,
  resolved_at   timestamptz,
  resolution_note text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint reports_target_present check (memorial_id is not null or tribute_id is not null)
);

create index reports_status_idx on reports (status) where status <> 'dismissed';
create index reports_memorial_idx on reports (memorial_id);
create index reports_tribute_idx on reports (tribute_id);

create trigger reports_set_updated_at
  before update on reports
  for each row execute function app.set_updated_at();
