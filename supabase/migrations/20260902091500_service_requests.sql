-- Evermora — Phase 2 data foundation
-- 0016 · service_requests
--
-- Family/visitor requests for Evermora-facilitated services. May precede a
-- memorial (memorial_id nullable). Handled by platform staff.

create table service_requests (
  id            uuid primary key default extensions.gen_random_uuid(),
  memorial_id   uuid references memorials (id) on delete set null,
  requested_by  uuid references profiles (id) on delete set null,

  contact_name  text not null,
  contact_email citext not null,
  contact_phone text,

  service_type  service_request_type not null default 'other',
  details       text,
  status        service_request_status not null default 'new',

  assigned_to   uuid references profiles (id) on delete set null,
  internal_notes text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  resolved_at   timestamptz,

  constraint service_requests_contact_name_len check (char_length(contact_name) between 1 and 160)
);

comment on column service_requests.internal_notes is 'Platform-staff only. Never exposed to requesters via RLS.';

create index service_requests_status_idx on service_requests (status);
create index service_requests_memorial_idx on service_requests (memorial_id);
create index service_requests_requested_by_idx on service_requests (requested_by);

create trigger service_requests_set_updated_at
  before update on service_requests
  for each row execute function app.set_updated_at();

-- Requester-facing projection: their own requests, without platform-internal
-- columns. SECURITY DEFINER + filtered by auth.uid(); base table SELECT is
-- restricted to platform staff.
create view my_service_requests
with (security_invoker = false)
as
  select
    sr.id, sr.memorial_id, sr.contact_name, sr.contact_email, sr.contact_phone,
    sr.service_type, sr.details, sr.status, sr.created_at, sr.updated_at, sr.resolved_at
  from service_requests sr
  where sr.requested_by = auth.uid();

grant select on my_service_requests to authenticated;
