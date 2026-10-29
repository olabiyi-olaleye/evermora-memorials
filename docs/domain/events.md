# Domain, notification & audit events

Three event streams, one emission point (the operation), one transaction.

| Stream                  | Table / mechanism                                                          | Consumers                                                                                       | Status                                                                           |
| ----------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Domain events**       | `DomainEventBuffer` → dispatched after commit                              | notification service, analytics, future subscribers                                             | buffer IMPLEMENTED; dispatch DEFERRED                                            |
| **Audit events**        | `audit_logs` row, written **in** the operation's transaction               | family (`admins.manage`), platform staff                                                        | table + triggers IMPLEMENTED; `recordAuditEvent` DEFERRED                        |
| **Notification events** | `notifications` row, written **in** the operation's transaction (Phase 5N) | in-app: the recipient, via the bell in family-portal / platform-admin; email: a delivery worker | recording + in-app centre IMPLEMENTED; delivery worker / email provider DEFERRED |

## Vocabulary (LOCKED — `@evermora/types`)

`DOMAIN_EVENTS` (and `AUDIT_ACTIONS`, which equals it):

```
memorial.created            memorial.published          memorial.archived
memorial.slug_changed       memorial.ownership_transferred
tribute.submitted           tribute.approved            tribute.rejected
tribute.hidden               tribute.edited
funeral_event.created       funeral_event.published     funeral_event.cancelled
family_update.published
memorial_admin.invited      memorial_role.changed
service_request.created     memorial.reported
share_asset.generated
```

`notification_event_type` (DB enum): `tribute_submitted`, `tribute_approved`,
`photo_submitted`, `admin_invited`, `funeral_event_published`,
`funeral_event_updated`, `family_update_published`, `service_request_received`,
`memorial_reported`, `anniversary_upcoming`.

## Emission rules

1. **In-transaction.** The audit row and any `notifications` rows are written in
   the **same** transaction as the operation's primary write. If the write rolls
   back, so do they.
2. **Domain events after commit.** `DomainEventBuffer.record(name, payload)`
   during the operation; the transport drains and dispatches **after** the
   transaction commits (an event must never claim something that didn't
   persist).
3. **One audit row per consequential action**, with `actor_profile_id`,
   `actor_kind`, `action`, `entity_type`/`entity_id`, `memorial_id`, and a
   **minimal** `metadata` jsonb — ids and from/to states only, never a tribute
   body, email, IP, or token ([audit-architecture.md](../architecture/audit-architecture.md)).
4. **Notifications decide recipients later.** The operation records the event;
   the notification service resolves recipients, channel, opt-outs, batching
   ([notification-architecture.md](../architecture/notification-architecture.md)).
5. **Triggers are a safety net, not the plan.** `memorial.status_changed` and
   `memorial.ownership_transferred` are written by DB triggers even if the
   domain forgets; the domain should still record its own richer audit event.

## Event → audit → notification map

| Operation                           | domain event                     | audit action                        | notification event                                              |
| ----------------------------------- | -------------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| `createMemorial`                    | `memorial.created`               | `memorial.created`                  | —                                                               |
| `publishMemorial`                   | `memorial.published`             | `memorial.published`                | — (family-initiated)                                            |
| `archiveMemorial`                   | `memorial.archived`              | `memorial.archived`                 | —                                                               |
| `changeMemorialSlug`                | `memorial.slug_changed`          | `memorial.slug_changed`             | —                                                               |
| `transferMemorialOwnership`         | `memorial.ownership_transferred` | `memorial.ownership_transferred`    | (new owner)                                                     |
| `approveTribute`                    | `tribute.approved`               | `tribute.approved`                  | — _(deferred — no email provider yet)_                          |
| `rejectTribute`                     | `tribute.rejected`               | `tribute.rejected`                  | —                                                               |
| `hideTribute`                       | `tribute.hidden`                 | `tribute.hidden`                    | —                                                               |
| `submitTribute` (not auto-approved) | `tribute.submitted`              | `tribute.submitted`                 | `tribute_submitted` (every other active member)                 |
| `editTribute` (not auto-approved)   | `tribute.edited`                 | `tribute.edited`                    | `tribute_submitted` (every other active member, `edited: true`) |
| `saveFuneralEvent` (create)         | `funeral_event.created`          | `funeral_event.created`             | —                                                               |
| `saveFuneralEvent` (update)         | —                                | `funeral_event.updated`             | — _(deferred — editing a published event doesn't notify yet)_   |
| `publishFuneralEvent`               | `funeral_event.published`        | `funeral_event.published`           | `funeral_event_published` (every other active member)           |
| `cancelFuneralEvent`                | `funeral_event.cancelled`        | `funeral_event.cancelled`           | `funeral_event_updated` (every other active member)             |
| `completeFuneralEvent`              | —                                | `funeral_event.completed`           | —                                                               |
| `removeFuneralEvent`                | —                                | `funeral_event.removed`             | —                                                               |
| `setFuneralPlanningStatus`          | —                                | `memorial.funeral_planning_changed` | —                                                               |
| `saveFamilyUpdate` (create)         | —                                | `family_update.created`             | —                                                               |
| `saveFamilyUpdate` (update)         | —                                | `family_update.updated`             | —                                                               |
| `publishFamilyUpdate`               | `family_update.published`        | `family_update.published`           | `family_update_published` (every other active member)           |
| `archiveFamilyUpdate`               | —                                | `family_update.archived`            | —                                                               |
| `removeFamilyUpdate`                | —                                | `family_update.removed`             | —                                                               |
| `inviteMemorialAdmin` (new invite)  | `memorial_admin.invited`         | `memorial_admin.invited`            | `admin_invited` (invitee, `channel = 'email'`)                  |
| `changeMemorialRole`                | `memorial_role.changed`          | `memorial_role.changed`             | —                                                               |
| `requestFuneralService`             | `service_request.created`        | `service_request.created`           | `service_request_received` (every platform admin)               |
| `reportTribute`                     | `memorial.reported`              | `memorial.reported`                 | `memorial_reported` (every platform admin)                      |
| `setMemorialModeration`             | —                                | `memorial.suspended` / `.restored`  | — _(deferred)_                                                  |
| `resolveReport`                     | —                                | `report.reviewed`                   | —                                                               |
| `updateServiceRequest`              | —                                | `service_request.updated`           | —                                                               |
| `generateShareAsset`                | `share_asset.generated`          | `share_asset.generated`             | —                                                               |
| `retireShareAsset`                  | —                                | `share_asset.retired`               | —                                                               |
| scheduled anniversary job           | —                                | —                                   | `anniversary_upcoming` _(not built)_                            |

`notifyMemorialMembers` / `notifyPlatformStaff` / `notifyByEmail`
(`packages/domain/src/operations/notify.ts`) are the one place that writes
`notifications` rows — always inside the operation's own transaction, always
excluding the acting caller. See
[notification-architecture.md](../architecture/notification-architecture.md).
