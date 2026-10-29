# Domain operation contracts

Each file here is a **specification** for one operation in `@evermora/domain`.
`createMemorial`, `publishMemorial`, `changeMemorialSlug` (Phase 5A) plus
`updateMemorialProfile`, `updateMemorialPrivacy`, `updateMemorialFeatures`
(Phase 5C), the story / milestone operations (Phase 5E), the album / media
operations (Phase 5F), the tribute operations `submitTribute`,
`approveTribute`, `rejectTribute`, `hideTribute`, `reportTribute` (Phase 5G),
`editTribute` and `setMemorialCover` (Phase 6B), and
the funeral operations `saveFuneralEvent`, `publishFuneralEvent`,
`cancelFuneralEvent`, `completeFuneralEvent`, `removeFuneralEvent`,
`setFuneralPlanningStatus` (Phase 5H), the family-update operations
`saveFamilyUpdate`, `publishFamilyUpdate`, `archiveFamilyUpdate`,
`removeFamilyUpdate` (Phase 5I), the share operations `generateShareAsset`,
`retireShareAsset` (Phase 5J), the family-access operations
`inviteMemorialAdmin`, `changeMemorialRole`, `transferMemorialOwnership`
(Phase 5K), `requestFuneralService` (Phase 5L), the platform-staff
moderation operations `setMemorialModeration`, `resolveReport`,
`updateServiceRequest` (Phase 5M), and the notification-centre operations
`listMyNotifications`, `markNotificationsRead` (Phase 5N) are
**IMPLEMENTED** — executable, unit- and integration-tested. Only
`reportMemorial` remains **SPECIFIED only**.

A contract is transport-independent: it describes `publishMemorial()`, never
`POST /…/publish`.

## Catalogue

| Operation                                                            | Contract                                                            | Caller               | Primary write                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------- |
| `createMemorial`                                                     | [create-memorial.md](./create-memorial.md)                          | authenticated family | `memorials` (+ owner membership, settings via triggers, first slug)               |
| `publishMemorial`                                                    | [publish-memorial.md](./publish-memorial.md)                        | `memorial.edit`      | `memorials.status → published`                                                    |
| `archiveMemorial`                                                    | [archive-memorial.md](./archive-memorial.md)                        | `memorial.edit`      | `memorials.status → archived`                                                     |
| `changeMemorialSlug`                                                 | [change-memorial-slug.md](./change-memorial-slug.md)                | `memorial.edit`      | `memorial_slugs` (new canonical + retire old)                                     |
| `updateMemorialProfile`                                              | [update-memorial-profile.md](./update-memorial-profile.md)          | `memorial.edit`      | `memorials` (name, headline, bio, dates, places)                                  |
| `updateMemorialPrivacy`                                              | [update-memorial-privacy.md](./update-memorial-privacy.md)          | `privacy.manage`     | `privacy_settings` (visibility, search indexing)                                  |
| `updateMemorialFeatures`                                             | [update-memorial-features.md](./update-memorial-features.md)        | `memorial.edit`      | `feature_settings` (product toggles)                                              |
| `saveStorySection`                                                   | [save-story-section.md](./save-story-section.md)                    | `story.edit`         | `story_sections` (upsert)                                                         |
| `removeStorySection` · `reorderStorySections`                        | [save-story-section.md](./save-story-section.md#related-operations) | `story.edit`         | `story_sections` (soft-delete / order)                                            |
| `saveMilestone`                                                      | [save-milestone.md](./save-milestone.md)                            | `story.edit`         | `milestones` (upsert)                                                             |
| `removeMilestone` · `reorderMilestones`                              | [save-milestone.md](./save-milestone.md#related-operations)         | `story.edit`         | `milestones` (soft-delete / order)                                                |
| `saveAlbum` · `removeAlbum`                                          | [save-album.md](./save-album.md)                                    | `gallery.manage`     | `albums` (upsert / soft-delete)                                                   |
| `recordMedia`                                                        | [record-media.md](./record-media.md)                                | `gallery.manage`     | `media` (row for an already-stored, validated file)                               |
| `updateMedia` · `removeMedia` · `reorderMedia`                       | [record-media.md](./record-media.md#related-operations)             | `gallery.manage`     | `media` (caption / album / visibility / order / soft-delete)                      |
| `setMemorialPortrait`                                                | [set-memorial-portrait.md](./set-memorial-portrait.md)              | `memorial.edit`      | `memorials.portrait_media_id`                                                     |
| `setMemorialCover`                                                   | [set-memorial-cover.md](./set-memorial-cover.md)                    | `memorial.edit`      | `memorials.cover_media_id`                                                        |
| `transferMemorialOwnership`                                          | [transfer-memorial-ownership.md](./transfer-memorial-ownership.md)  | `owner`              | `memorial_memberships` (demote + promote, via `transfer_memorial_ownership` RPC)  |
| `submitTribute`                                                      | [submit-tribute.md](./submit-tribute.md)                            | anyone (incl. anon)  | `tributes` (pending, or approved when moderation is off)                          |
| `editTribute`                                                        | [edit-tribute.md](./edit-tribute.md)                                | anyone (edit token)  | `tributes` (content + status → pending/approved, via `apply_tribute_edit` RPC)    |
| `approveTribute` · `rejectTribute` · `hideTribute`                   | [moderate-tribute.md](./moderate-tribute.md)                        | `tributes.moderate`  | `tributes.status`                                                                 |
| `reportTribute`                                                      | [report-tribute.md](./report-tribute.md)                            | anyone (incl. anon)  | `reports` (open)                                                                  |
| `saveFuneralEvent`                                                   | [save-funeral-event.md](./save-funeral-event.md)                    | `funeral.manage`     | `funeral_events` (upsert; new = draft)                                            |
| `removeFuneralEvent` · `setFuneralPlanningStatus`                    | [save-funeral-event.md](./save-funeral-event.md#related-operations) | `funeral.manage`     | `funeral_events` (soft-delete) · `memorials.funeral_planning_status`              |
| `publishFuneralEvent` · `completeFuneralEvent`                       | [publish-funeral-event.md](./publish-funeral-event.md)              | `funeral.manage`     | `funeral_events.status`                                                           |
| `cancelFuneralEvent`                                                 | [cancel-funeral-event.md](./cancel-funeral-event.md)                | `funeral.manage`     | `funeral_events.status → cancelled`                                               |
| `saveFamilyUpdate`                                                   | [save-family-update.md](./save-family-update.md)                    | `updates.publish`    | `family_updates` (upsert; new = draft)                                            |
| `publishFamilyUpdate` · `archiveFamilyUpdate` · `removeFamilyUpdate` | [save-family-update.md](./save-family-update.md#related-operations) | `updates.publish`    | `family_updates.status` · soft-delete                                             |
| `inviteMemorialAdmin`                                                | [invite-memorial-admin.md](./invite-memorial-admin.md)              | `admins.manage`      | `memorial_memberships` (invited by email; `accept_memorial_invite` RPC claims it) |
| `changeMemorialRole`                                                 | [change-memorial-role.md](./change-memorial-role.md)                | `admins.manage`      | `memorial_memberships` (role / status; cancel a pending invite)                   |
| `requestFuneralService`                                              | [request-funeral-service.md](./request-funeral-service.md)          | anyone (incl. anon)  | `service_requests` (`status='new'`, unassigned; honeypot-guarded)                 |
| `reportMemorial`                                                     | [report-memorial.md](./report-memorial.md)                          | anyone (incl. anon)  | `reports` (open)                                                                  |
| `setMemorialModeration` · `resolveReport` · `updateServiceRequest`   | [platform-moderation.md](./platform-moderation.md)                  | platform staff       | `memorials.status` · `reports.status` · `service_requests`                        |
| `generateShareAsset` · `retireShareAsset`                            | [generate-share-asset.md](./generate-share-asset.md)                | `memorial.edit`      | `share_resolvers` (mint / retire — never deleted)                                 |
| `listMyNotifications` · `markNotificationsRead`                      | [notifications.md](./notifications.md)                              | authenticated (own)  | `notifications` (read / `read_at`)                                                |
| `recordAuditEvent`                                                   | [record-audit-event.md](./record-audit-event.md)                    | internal (any op)    | `audit_logs`                                                                      |

Visitor-authored **tribute submission** is [submitTribute](./submit-tribute.md)
(Phase 5G). **Remembrance actions** (candles / flowers) are still covered only
in the [visitor flow](../../product/flows/visitor.md); their DB-level rules are
in [rls-architecture.md](../../architecture/rls-architecture.md).

## Contract template

Each file follows this structure:

```
# <operation>
Purpose · Business responsibility
Caller context · Input · Output
Authentication · Authorization
Validation · Invariants · Preconditions
Database interactions · Transaction boundary
Side effects · Domain event · Audit event · Notification event
Errors
Idempotency
Security considerations
Related entities · Related product flows
```

Cross-cutting references: [../errors.md](../errors.md) · [../events.md](../events.md)
· [../validation.md](../validation.md) ·
[../transactions-and-idempotency.md](../transactions-and-idempotency.md) ·
[../../architecture/authorization-architecture.md](../../architecture/authorization-architecture.md).
