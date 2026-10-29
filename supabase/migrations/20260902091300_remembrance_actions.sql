-- Evermora — Phase 2 data foundation
-- 0014 · remembrance_actions
--
-- Lightweight visitor gestures (candle, flower, prayer, stone, heart).
-- No visitor account required; a coarse session token allows soft de-dupe.

create table remembrance_actions (
  id            uuid primary key default extensions.gen_random_uuid(),
  memorial_id   uuid not null references memorials (id) on delete cascade,
  action_type   remembrance_action_type not null default 'candle',
  visitor_display_name text,
  message       text,
  visitor_session text,          -- opaque client token, not PII
  submitted_ip  inet,
  hidden_at     timestamptz,
  hidden_by     uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint remembrance_actions_message_len check (message is null or char_length(message) <= 500)
);

create index remembrance_actions_memorial_idx
  on remembrance_actions (memorial_id, created_at desc)
  where hidden_at is null;

-- One action of a given type per visitor session per memorial (soft de-dupe).
create unique index remembrance_actions_session_dedupe
  on remembrance_actions (memorial_id, action_type, visitor_session)
  where visitor_session is not null;

-- ---------------------------------------------------------------------------
-- Public aggregate counts (so apps/web never enumerates rows for anon users).
-- ---------------------------------------------------------------------------
create view remembrance_action_counts
with (security_invoker = false)
as
  select ra.memorial_id, ra.action_type, count(*)::bigint as total
  from remembrance_actions ra
  join memorials m on m.id = ra.memorial_id
  where ra.hidden_at is null
    and m.status = 'published'
    and m.deleted_at is null
  group by ra.memorial_id, ra.action_type;

comment on view remembrance_action_counts is
  'Public aggregate gesture counts. SECURITY DEFINER: anon has no privilege on the base table.';

grant select on remembrance_action_counts to anon, authenticated;
