-- Evermora — Phase 2 data foundation
-- 0025 · Harden Data API grants
--
-- Depending on the Supabase platform version, `anon` / `authenticated` may be
-- granted broad privileges on every new `public` table via ALTER DEFAULT
-- PRIVILEGES. RLS still backstops this (deny-by-default for commands without a
-- policy), but we want least privilege at the grant layer too.
--
-- This migration: revoke everything from the Data API roles across `public`,
-- lock the default for future objects, then re-grant exactly the surface the
-- app needs. It is idempotent and safe to re-run.

-- ---- 1. Revoke broad access ---------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all routines in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on routines from anon, authenticated;

-- ---- 2. Re-grant the anonymous-visitor surface -----------------------------
-- Read: public-facing content only. `tributes` / `remembrance_actions` are
-- intentionally excluded — anon reads those via the SECURITY DEFINER views.
grant select on
  memorials, memorial_people, memorial_slugs, reserved_slugs,
  media, albums, story_sections, funeral_events, family_updates,
  feature_settings, privacy_settings
to anon;

-- Write: tribute submission, remembrance gesture, report, service enquiry.
grant insert on tributes, remembrance_actions, reports, service_requests to anon;

-- SECURITY DEFINER projections used by apps/web.
grant select on public_tributes, remembrance_action_counts to anon, authenticated;

-- ---- 3. Re-grant the authenticated (family) surface -----------------------
grant select, insert, update, delete on
  profiles, memorials, memorial_people, memorial_memberships, memorial_slugs,
  share_resolvers, media, albums, story_sections, tributes, funeral_events,
  family_updates, remembrance_actions, feature_settings, privacy_settings,
  service_requests, reports
to authenticated;
grant select, update on notifications to authenticated;
grant select on reserved_slugs, audit_logs to authenticated;
grant select on my_service_requests to authenticated;

-- ---- 4. Execute on the resolver / helper RPCs -----------------------------
grant execute on function
  public.resolve_memorial_slug(text),
  public.slug_is_available(text),
  public.resolve_share_token(text)
to anon, authenticated;

-- ---- 5. Sequences the granted inserts need -------------------------------
grant usage, select on all sequences in schema public to authenticated;
