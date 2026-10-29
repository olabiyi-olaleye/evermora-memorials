-- Evermora — Phase 5G
-- Adopted MVP decision (architecture spec §37): when a memorial has
-- `feature_settings.tribute_moderation_enabled = false`, a valid new tribute
-- becomes `approved` immediately — it is cleaner than parking content in a
-- queue no one will look at.
--
-- The domain `submitTribute` operation sets the status; this migration widens
-- the RLS insert policy so a submitter (incl. `anon`) may write that
-- auto-approved row, but ONLY when moderation is genuinely disabled and the
-- row is otherwise clean. Moderation-enabled memorials still only accept a
-- `pending` insert — a submitter can never self-approve.

drop policy tributes_insert_public on tributes;

create policy tributes_insert_public on tributes
  for insert to anon, authenticated
  with check (
    deleted_at is null
    and moderated_by is null
    and moderated_at is null
    and app.can_read_memorial(memorial_id)
    and exists (
      select 1 from feature_settings fs
      where fs.memorial_id = tributes.memorial_id and fs.tributes_enabled
    )
    and (
      -- normal path: a fresh pending tribute awaiting moderation
      (status = 'pending' and published_at is null)
      or
      -- auto-approve path: only when moderation is OFF for this memorial
      (
        status = 'approved'
        and published_at is not null
        and not exists (
          select 1 from feature_settings fs
          where fs.memorial_id = tributes.memorial_id and fs.tribute_moderation_enabled
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Per-IP submission rate limiting needs to count rows `anon` cannot SELECT
-- (the base table hides tributes from non-members). This SECURITY DEFINER
-- helper returns ONLY a count — no IPs, no message content — so the domain
-- `submitTribute` operation can throttle anonymous submitters.
-- ---------------------------------------------------------------------------
create or replace function public.recent_tributes_from_ip(
  target_memorial uuid, from_ip inet, since timestamptz
)
returns integer
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select count(*)::int
  from public.tributes
  where memorial_id = target_memorial
    and submitted_ip = from_ip
    and created_at >= since
    and deleted_at is null;
$$;

comment on function public.recent_tributes_from_ip(uuid, inet, timestamptz) is
  'Count of tributes from an IP to a memorial since a time. SECURITY DEFINER — returns a bare count so the tribute submission rate limit works for anon.';

grant execute on function public.recent_tributes_from_ip(uuid, inet, timestamptz) to anon, authenticated;
