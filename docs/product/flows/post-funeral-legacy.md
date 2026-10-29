# Flow — Post-funeral legacy

**Actor** the family (`owner` / `admin` / `content_editor`).
**Goal** the memorial's life _after_ the service — thanksgiving, ongoing
updates, tidying, and keeping it as a lasting place. Evermora is not just a
funeral tool.

## Steps

| #   | Screen                     | Action                                                                                                        | System                                                                                                                                                                        |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/memorials/{id}/funeral`  | mark past events `completed` (or a scheduled job does when the date passes)                                   | `funeral_events.status = 'completed'`; `funeral_planning_status` may reach `completed` — **memorial status is unaffected** (a completed funeral doesn't archive the memorial) |
| 2   | `/memorials/{id}/funeral`  | add a **thanksgiving** event later (weeks/months on)                                                          | `saveFuneralEvent` type `thanksgiving` → `publishFuneralEvent` (publish-time notification deferred to Phase 5N)                                                               |
| 3   | `/memorials/{id}/updates`  | post an official update: "Thank you from the family", photos from the day, a scholarship in the person's name | [`saveFamilyUpdate`](../../domain/operations/save-family-update.md) → `publishFamilyUpdate` (re-notify on `urgent` deferred to Phase 5N)                                      |
| 4   | `/memorials/{id}/story`    | keep enriching the life story over time                                                                       | ongoing `story_sections` edits                                                                                                                                                |
| 5   | `/memorials/{id}/gallery`  | add photos contributed by relatives (via approved tribute photos or direct upload)                            | `media`                                                                                                                                                                       |
| 6   | `/memorials/{id}/tributes` | keep moderating tributes as they trickle in on anniversaries                                                  | ongoing moderation                                                                                                                                                            |
| 7   | `/memorials/{id}/privacy`  | optionally tighten visibility once the acute period passes (e.g. public → anyone-with-link)                   | `updatePrivacySettings`                                                                                                                                                       |
| 8   | `/memorials/{id}/settings` | **Archive** the memorial if the family wants to close it                                                      | [`archiveMemorial`](../../domain/operations/archive-memorial.md) — reversible; content retained; public page shows "not available"; re-open later with `publishMemorial`      |
| 9   | `/memorials/{id}/access`   | hand stewardship to the next generation                                                                       | [`transferMemorialOwnership`](../../domain/operations/transfer-memorial-ownership.md)                                                                                         |
| 10  | (rare) `/settings`         | **Delete** the memorial (owner only, typed confirmation, re-auth)                                             | soft delete; guarded (`memorial.delete`); audit rows survive (FKs `set null`)                                                                                                 |

## The "anniversary" moment (FUTURE)

`anniversary_upcoming` is a reserved notification event: a scheduled job would
gently notify members before a birth/death anniversary so they can add a memory
or an update. The scheduler is [deferred](../future-scope.md).

## Events

audit `funeral_event.*`, `family_update.published`, `memorial.archived`,
`memorial.ownership_transferred` · `MEMORIAL_ARCHIVED` · notification
`family_update_published`, `funeral_event_published`.

## Edge cases

- **Archive ≠ delete** — archiving is a reversible "close for now"; nothing is
  lost. Deletion is owner-only, guarded, rare, and soft.
- **Completed funeral does not auto-archive** — the two lifecycles are
  independent (a family often keeps a published memorial indefinitely).
- **Ownership passes on death of the owner** — handled by
  `transferMemorialOwnership` initiated by the owner earlier, or by platform
  support with the family's authorisation (audited).
- **A dormant memorial** — stays published and reachable; no decay, no
  "reactivate your memorial" nagging.

## Principles touched

Timeless (a lasting place, not a one-week tool) · family-controlled (archive,
tighten privacy, hand over) · no grief exploitation (no re-engagement dark
patterns) · respectful (an archived memorial fails gently).
