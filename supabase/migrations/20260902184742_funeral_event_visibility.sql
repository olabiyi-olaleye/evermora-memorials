-- Evermora — Phase 5H · funeral management
-- Event-level visibility for funeral_events (§39).
--
-- The original policy (0023) made every *published* event visible whenever the
-- `funeral_events` section was readable, ignoring the row's own `visibility`.
-- The funeral model is event-level: a whole event card is shown or hidden per
-- its `visibility`. A non-member may only see a published event whose visibility
-- defers to the section (`inherit`) or is explicitly `public`; `members` and
-- `private` events stay internal. Members and platform admins are unaffected.

drop policy funeral_events_select on funeral_events;

create policy funeral_events_select on funeral_events
  for select to anon, authenticated
  using (
    deleted_at is null
    and (
      app.is_memorial_member(memorial_id)
      or (
        status = 'published'
        and visibility in ('inherit', 'public')
        and app.can_read_memorial_section(memorial_id, 'funeral_events')
      )
    )
  );
