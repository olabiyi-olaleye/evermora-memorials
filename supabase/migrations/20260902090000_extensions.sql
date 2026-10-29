-- Evermora — Phase 2 data foundation
-- 0001 · Extensions and the private `app` helper schema
--
-- `app` holds SECURITY DEFINER authorization helpers used by RLS policies.
-- It is never exposed through the Data API (not in `[api].schemas`).

create schema if not exists app;
revoke all on schema app from anon, authenticated;
grant usage on schema app to anon, authenticated, service_role;

-- gen_random_uuid(), gen_random_bytes()
create extension if not exists pgcrypto with schema extensions;
-- case-insensitive text for slugs, emails, reserved words
create extension if not exists citext with schema extensions;
-- trigram indexes for name search (memorials, people)
create extension if not exists pg_trgm with schema extensions;
