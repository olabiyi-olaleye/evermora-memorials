-- Evermora — Phase 5I · family updates
-- Per-update visibility for family_updates.
--
-- The original policy (0023) made every *published* update visible whenever the
-- `updates` section was readable, ignoring the row's own `visibility`. Family
-- updates can carry sensitive logistics; a non-member should see a published
-- update only when its visibility defers to the section (`inherit`) or is
-- explicitly `public`. `members` / `private` updates stay internal. Members and
-- platform admins are unaffected.

drop policy family_updates_select on family_updates;

create policy family_updates_select on family_updates
  for select to anon, authenticated
  using (
    deleted_at is null
    and (
      app.is_memorial_member(memorial_id)
      or (
        status = 'published'
        and visibility in ('inherit', 'public')
        and app.can_read_memorial_section(memorial_id, 'updates')
      )
    )
  );
