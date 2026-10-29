# Permission matrix

The single source of truth for the mapping is the SQL function
**`app.has_memorial_permission(memorial_id, permission)`**
([../architecture/authorization-architecture.md](../architecture/authorization-architecture.md)).
The domain layer checks the **same permission strings**, and the UI hides what
the caller cannot do. This table restates that mapping for product use.

## Memorial permissions × roles

| Permission                                                                        | owner | admin | content_editor | tribute_moderator | viewer |
| --------------------------------------------------------------------------------- | :---: | :---: | :------------: | :---------------: | :----: |
| `memorial.edit` — identity, dates, message, publish, archive                      | done  | done  |      done      |         —         |   —    |
| `story.edit` — story sections                                                     | done  | done  |      done      |         —         |   —    |
| `gallery.manage` — albums, media, uploads                                         | done  | done  |      done      |         —         |   —    |
| `funeral.manage` — funeral events                                                 | done  | done  |      done      |         —         |   —    |
| `updates.publish` — family updates                                                | done  | done  |      done      |         —         |   —    |
| `tributes.moderate` — approve/reject/hide tributes, hide remembrances             | done  | done  |       —        |       done        |   —    |
| `admins.manage` — invite/change/remove members, view per-memorial audit           | done  | done  |       —        |         —         |   —    |
| `privacy.manage` — visibility, per-section privacy, search indexing               | done  | done  |       —        |         —         |   —    |
| `billing.manage` — subscription/payment (FUTURE)                                  | done  |   —   |       —        |         —         |   —    |
| `memorial.delete` — soft/hard delete the memorial                                 | done  |   —   |       —        |         —         |   —    |
| **transfer ownership** (dedicated operation, not a `has_memorial_permission` key) | done  |   —   |       —        |         —         |   —    |
| **read `members`-only sections** (family details, burial location, private media) | done  | done  |      done      |       done        |  done  |
| **read the memorial while draft / archived / suspended**                          | done  | done  |      done      |       done        |  done  |

`viewer` has **read** access to everything on the memorial (including
`members`-only sections and non-published states) but **no** write permission.

## Platform staff

`profiles.is_platform_admin = true` — **not** in the table above by design.
Platform capabilities (separate, explicit, audited):

| Capability                                                                   | Notes                                                                                                  |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| view any user / memorial / membership / report / service request / audit log | read across the platform                                                                               |
| **suspend / unsuspend** a memorial (`status = 'suspended'`)                  | platform-only; enforced by the `memorials_guard_lifecycle` trigger                                     |
| hide a tribute / remembrance on any memorial                                 | via `tributes_update_moderators` / `remembrance_update_moderators` policy `or app.is_platform_admin()` |
| manage service requests incl. `internal_notes`, `assigned_to`                | base `service_requests` table is staff-only                                                            |
| grant/revoke `is_platform_admin`                                             | trigger-guarded to existing admins / `service_role`                                                    |

Platform staff do **not** get `memorial.edit` / `story.edit` / etc. on a
family's memorial — they cannot rewrite a family's story or publish their
memorial. Content intervention happens through moderation (hide) and lifecycle
(suspend), never silent editing.

## Visitor (anonymous) — capability, not a role

| Action                           | Condition                                                           |
| -------------------------------- | ------------------------------------------------------------------- |
| view memorial + approved content | memorial `published` **and** visibility `public`/`anyone_with_link` |
| submit a tribute (`pending`)     | `feature_settings.tributes_enabled`                                 |
| submit a tribute photo           | `tributes_enabled` **and** `photo_contributions_enabled`            |
| leave a remembrance action       | `feature_settings.candles_enabled`                                  |
| report a memorial / tribute      | always                                                              |
| submit a service request         | always                                                              |

All enforced by RLS `WITH CHECK` on anonymous inserts, plus rate limiting /
bot defence (PLANNED).

## How the three layers stay aligned

```
UI: disable/hide the control                         (permission-matrix.md)
Domain: if (!hasPermission(memorialId, 'x')) throw ForbiddenError   (same strings)
RLS: using ( app.has_memorial_permission(memorial_id, 'x') )        (same strings)
```

Changing a role's permissions means editing `app.has_memorial_permission` (a
migration) **and** the domain checks **and** this table — reviewed together.
