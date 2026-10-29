-- Evermora — Phase 2 data foundation
-- 0017 · notifications  (§22)
--
-- Provider-agnostic notification event store. No coupling to Resend/Postmark/etc.
-- Delivery adapters (Phase later) read pending rows and set sent_at.

create table notifications (
  id            uuid primary key default extensions.gen_random_uuid(),
  recipient_profile_id uuid references profiles (id) on delete cascade,
  recipient_email citext,               -- for pre-account invitees
  memorial_id   uuid references memorials (id) on delete cascade,
  event_type    notification_event_type not null,
  channel       notification_channel not null default 'in_app',
  payload       jsonb not null default '{}'::jsonb,
  read_at       timestamptz,
  sent_at       timestamptz,
  created_at    timestamptz not null default now(),
  constraint notifications_recipient_present check (
    recipient_profile_id is not null or recipient_email is not null
  )
);

create index notifications_recipient_unread_idx
  on notifications (recipient_profile_id, created_at desc)
  where read_at is null;
create index notifications_pending_send_idx
  on notifications (created_at)
  where sent_at is null;
create index notifications_memorial_idx on notifications (memorial_id);
