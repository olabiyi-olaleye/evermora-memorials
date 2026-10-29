-- Evermora — Phase 2 data foundation
-- 0020 · Enable RLS everywhere + explicit Data API grants
--
-- RLS is a primary security layer (master §16). Every table below has RLS
-- enabled and FORCE'd (so even the table owner is subject to policy in local
-- testing). The service_role key bypasses RLS by design and is server-only.
--
-- Grants are explicit because new `public` tables are not auto-exposed to the
-- Data API roles as of 2026-05-30.

-- ---- Enable + force RLS -----------------------------------------------------
alter table profiles              enable row level security;
alter table memorials             enable row level security;
alter table memorial_people       enable row level security;
alter table memorial_memberships  enable row level security;
alter table reserved_slugs        enable row level security;
alter table memorial_slugs        enable row level security;
alter table share_resolvers       enable row level security;
alter table media                 enable row level security;
alter table albums                enable row level security;
alter table story_sections        enable row level security;
alter table tributes              enable row level security;
alter table funeral_events        enable row level security;
alter table family_updates        enable row level security;
alter table remembrance_actions   enable row level security;
alter table feature_settings      enable row level security;
alter table privacy_settings      enable row level security;
alter table service_requests      enable row level security;
alter table notifications         enable row level security;
alter table reports               enable row level security;
alter table audit_logs            enable row level security;

-- ---- Base table privileges (RLS still applies on top) ---------------------
-- Read surface for anonymous visitors. NOTE: `tributes` and
-- `remembrance_actions` are deliberately absent — anon reads those only through
-- the SECURITY DEFINER projections `public_tributes` / `remembrance_action_counts`.
grant select on
  memorials, memorial_people, memorial_slugs, reserved_slugs,
  media, albums, story_sections, funeral_events, family_updates,
  feature_settings, privacy_settings
to anon;

-- Anonymous visitor write surface (tribute submission, remembrance gesture,
-- report, service enquiry). RLS WITH CHECK constrains exactly what may be written.
grant insert on tributes, remembrance_actions, reports, service_requests to anon;

-- Authenticated (family) roles: CRUD surface, gated by RLS/permissions.
grant select, insert, update, delete on
  profiles, memorials, memorial_people, memorial_memberships, memorial_slugs,
  share_resolvers, media, albums, story_sections, tributes, funeral_events,
  family_updates, remembrance_actions, feature_settings, privacy_settings,
  service_requests, reports
to authenticated;
-- Notifications: recipients read + mark-read only; rows are created server-side.
grant select, update on notifications to authenticated;
grant select on reserved_slugs, audit_logs to authenticated;

-- Private columns are protected by ROW scope, not column scope: the base-table
-- SELECT policies for `tributes`, `service_requests` and `reports` only expose a
-- row to memorial members / platform staff. Everyone else uses the SECURITY
-- DEFINER projections below, which omit the private columns entirely.

-- Sequences for identity/serial columns used by authenticated inserts.
grant usage, select on all sequences in schema public to anon, authenticated;
