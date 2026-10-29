# Feature settings architecture

Per-memorial capability toggles. **A fixed set of product switches — not a
generic feature-flag / experimentation engine.**

Status: **IMPLEMENTED** (table + defaults + auto-provisioning + RLS). The UI to
change them is DEFERRED ([../product/screen-inventory.md](../product/screen-inventory.md)).

## `feature_settings` table

`memorial_id` (PK → `memorials`, `on delete cascade`) + boolean columns +
`updated_at`. One row per memorial, created by the
`memorials_provision_settings` trigger on memorial insert (alongside
`privacy_settings`).

| Toggle                        | Default | Effect                                                                                                                     |
| ----------------------------- | :-----: | -------------------------------------------------------------------------------------------------------------------------- |
| `tributes_enabled`            |   on    | visitors may submit tributes; gates the anon tribute `INSERT` policy and the `tribute-uploads` storage policy              |
| `tribute_moderation_enabled`  |   on    | tributes require approval before they are public (when off, the domain layer may auto-approve — still `pending` at the DB) |
| `photo_contributions_enabled` | **off** | visitors may attach photos to tributes; gates the `tribute-uploads` storage `INSERT` policy                                |
| `candles_enabled`             |   on    | remembrance gestures; gates the anon `remembrance_actions` `INSERT` policy                                                 |
| `funeral_enabled`             |   on    | the funeral section is shown                                                                                               |
| `family_section_enabled`      | **off** | the family / related-people section is shown                                                                               |
| `updates_enabled`             |   on    | family updates section is shown                                                                                            |
| `guestbook_enabled`           |   on    | (reserved for a guestbook surface distinct from tributes)                                                                  |
| `sharing_enabled`             |   on    | share links / buttons are shown                                                                                            |
| `qr_code_enabled`             |   on    | QR generation is offered                                                                                                   |
| `visitor_analytics_enabled`   |   on    | first-party visitor counting for this memorial ([analytics-events.md](./analytics-events.md))                              |

## Where the toggles are enforced

- **Database (RLS `WITH CHECK`)** — `tributes_enabled`, `candles_enabled`,
  `photo_contributions_enabled` are checked in the anon `INSERT` policies for
  `tributes` / `remembrance_actions` and in the `tribute-uploads` storage
  policy. Turning a toggle off **immediately** stops new submissions at the
  database, not just in the UI.
- **Domain layer** — every operation that creates the relevant content checks
  the toggle and returns a `precondition_failed` `DomainError` if it is off.
- **UI** — `apps/web` hides a disabled section/affordance;
  `apps/family-portal` shows the toggle.

## Writes

`feature_settings` update requires `memorial.edit`
([authorization-architecture.md](./authorization-architecture.md)); platform
admins may also update. No `INSERT`/`DELETE` by end users — the row's lifecycle
follows the memorial.

## Relationship to privacy

Feature settings answer **"is this capability available?"**; privacy settings
answer **"who may see it?"**. They are separate concerns and separate tables —
turning `funeral_enabled` on does not make funeral events public; that is
`privacy_settings.funeral_events_visibility`
([privacy-architecture.md](./privacy-architecture.md)).

## Not a feature-flag engine

No targeting rules, no percentages, no environments, no experiment framework.
Adding a toggle means adding a column + default + (usually) a policy/domain
check — a deliberate product decision, reviewed.
