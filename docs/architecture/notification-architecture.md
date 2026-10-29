# Notification architecture

| Concern                                                                                                                   | Status                      |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Provider abstraction (domain event → service → adapter → provider)                                                        | LOCKED                      |
| `notifications` table (event store, provider-agnostic)                                                                    | IMPLEMENTED                 |
| `notification_event_type` / `notification_channel` enums                                                                  | IMPLEMENTED                 |
| In-transaction recording (`notifyMemorialMembers` / `notifyPlatformStaff` / `notifyByEmail`, Phase 5N)                    | IMPLEMENTED                 |
| In-app notification centre (`listMyNotifications` / `markNotificationsRead` + a bell in family-portal and platform-admin) | IMPLEMENTED                 |
| Notification **service**, delivery worker, digests                                                                        | DEFERRED                    |
| Email **provider** (Resend / Postmark / …)                                                                                | **DEFERRED — not selected** |

## Flow

```
domain operation (in the same transaction as the mutation)
   │  notify.ts: notifyMemorialMembers / notifyPlatformStaff / notifyByEmail
   │  resolves recipients (elevated read of memorial_memberships /
   │  profiles.is_platform_admin — the actor may not have RLS visibility into
   │  who else to notify, e.g. an anonymous tribute submitter) and inserts
   │  `notifications` rows via a narrow service_role escalation (`authenticated`
   │  has no INSERT on the table — same pattern as `audit_logs`)
   ▼
`channel = 'in_app'` rows            `channel = 'email'` rows
   │  read + marked read through          │  sit with `sent_at is null`,
   │  RLS (`listMyNotifications` /         │  waiting for a delivery worker
   │  `markNotificationsRead`) and         │  that does not exist yet — see
   │  rendered by the bell in each app     │  "Email provider" below
   ▼                                       ▼
recipient sees it in-app now             DEFERRED (needs a provider decision)
```

Domain logic never imports a provider SDK — `notify.ts` only ever writes rows.
The eventual delivery worker (a separate, provider-aware process) is the one
piece with a provider dependency.

## `notifications` table (IMPLEMENTED)

`id, recipient_profile_id?, recipient_email? (for pre-account invitees),
memorial_id?, event_type (notification_event_type), channel
(in_app | email, default in_app), payload jsonb, read_at?, sent_at?, created_at`.
Constraint: a recipient (`recipient_profile_id` or `recipient_email`) is
required.

Indexes: unread-per-recipient, pending-send (`sent_at is null`), per-memorial.

RLS: recipients `select` + `update` (mark read) their own rows;
platform admins `select` all. **Rows are created server-side** (`service_role` /
triggers) — there is no `anon`/`authenticated` `insert` policy or grant.

## Event vocabulary (`notification_event_type`)

| Event                      | Wired? | Fired when                                                           | Actual recipients (Phase 5N)                                 |
| -------------------------- | ------ | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| `tribute_submitted`        | yes    | `submitTribute`, only when not auto-approved                         | every other active memorial member (`notifyMemorialMembers`) |
| `tribute_approved`         | no     | —                                                                    | DEFERRED — needs the email provider to be worth building     |
| `photo_submitted`          | no     | —                                                                    | DEFERRED                                                     |
| `admin_invited`            | yes    | `inviteMemorialAdmin`, new invite                                    | the invitee, `channel = 'email'` (`notifyByEmail`)           |
| `funeral_event_published`  | yes    | `publishFuneralEvent`                                                | every other active memorial member                           |
| `funeral_event_updated`    | yes    | `cancelFuneralEvent` (editing a draft/published field does not, yet) | every other active memorial member                           |
| `family_update_published`  | yes    | `publishFamilyUpdate`                                                | every other active memorial member                           |
| `service_request_received` | yes    | `requestFuneralService`                                              | every platform-admin account (`notifyPlatformStaff`)         |
| `memorial_reported`        | yes    | `reportTribute`                                                      | every platform-admin account                                 |
| `anniversary_upcoming`     | no     | —                                                                    | DEFERRED — needs a scheduled job, not built this phase       |

Phase 5N deliberately fans a `tribute_submitted` / `funeral_event_published` /
`family_update_published` notification out to **every** active member, not
just members holding a specific permission (e.g. `tributes.moderate`) — a
per-permission filter is a later refinement, not a correctness gap: every
active member can already see the underlying content once RLS lets them in.
`notifyMemorialMembers` always excludes the acting caller.

These names mirror `@evermora/types` `DOMAIN_EVENTS` where a domain event has a
notification counterpart. See [`../domain/events.md`](../domain/events.md).

## Principles

- These are **official notices**, not a social feed — no "someone viewed your
  memorial" noise, no engagement bait.
- Every recipient can opt out per memorial / per event class (opt-out model
  DEFERRED; `profiles.marketing_opt_in` exists for marketing only).
- Anonymous tribute authors get at most a single "your tribute was approved"
  email if they provided an address; that address is
  [private](./privacy-architecture.md) and never exposed.
- Batching/digest for high-volume memorials is a service concern, DEFERRED.

## Choosing the provider (DEFERRED)

Criteria: deliverability, EU data residency (org region is `eu-west-1`),
templating, bounce/complaint webhooks, cost at expected volume, simple domain
verification. Candidates: Resend, Postmark, SES. Decision recorded here when the
notification service is built; the local stack uses Inbucket meanwhile.
