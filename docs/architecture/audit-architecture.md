# Audit architecture

An **append-only** record of consequential actions, used by families
(`admins.manage` scope) and platform staff for accountability and abuse
investigation.

| Concern                                              | Status                                                                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `audit_logs` table, append-only, RLS-scoped          | IMPLEMENTED                                                                                                       |
| Trigger-written entries for the highest-value events | IMPLEMENTED                                                                                                       |
| Domain-layer `recordAuditEvent` for the rest         | DEFERRED (contract in [`../domain/operations/record-audit-event.md`](../domain/operations/record-audit-event.md)) |
| Retention / export / tamper-evidence                 | DEFERRED                                                                                                          |

## `audit_logs` table (IMPLEMENTED)

```
id            bigint generated always as identity
actor_profile_id  uuid? → profiles (set null on delete)
actor_kind    audit_actor_kind  (user | platform_admin | system | anonymous)
action        text              e.g. 'memorial.published', 'memorial.slug_changed'
entity_type   text?             'memorial' | 'tribute' | 'memorial_membership' | …
entity_id     uuid?
memorial_id   uuid? → memorials (set null on delete)
metadata      jsonb  default '{}'
created_at    timestamptz default now()
```

### Append-only enforcement

- `UPDATE`, `DELETE`, `TRUNCATE` are **revoked** from `anon` and `authenticated`.
- There is **no** `UPDATE`/`DELETE` RLS policy — even a granted role is
  deny-by-default for those commands.
- `INSERT` is not granted to `anon`/`authenticated` either — rows come only from
  `service_role` (the domain layer) or from SECURITY DEFINER triggers.

### Read access (RLS `audit_logs_select`)

- platform admins → all rows;
- memorial members with `admins.manage` → rows for **their** memorial
  (`memorial_id` scoped).

Non-members and lesser roles get **no rows** (verified in `supabase/tests`).

## Trigger-written events (IMPLEMENTED)

Written even if the domain layer forgets:

| Trigger                                                                          | Action recorded                  | Metadata                 |
| -------------------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| `memorials_audit_status_change` (AFTER UPDATE on `memorials`)                    | `memorial.status_changed`        | `{from, to}`             |
| `memberships_audit_owner_change` (AFTER INSERT/UPDATE on `memorial_memberships`) | `memorial.ownership_transferred` | `{new_owner_profile_id}` |

`actor_profile_id` = `auth.uid()`; `actor_kind` = `system` when there is no JWT
(migrations / jobs), else `user`.

## Domain-layer audit events (DEFERRED — vocabulary LOCKED)

`@evermora/types` `AUDIT_ACTIONS` (= `DOMAIN_EVENTS`): `memorial.created`,
`memorial.published`, `memorial.archived`, `memorial.slug_changed`,
`memorial.ownership_transferred`, `tribute.submitted`, `tribute.approved`,
`tribute.rejected`, `tribute.hidden`, `funeral_event.created`,
`funeral_event.published`, `funeral_event.cancelled`, `family_update.published`,
`memorial_admin.invited`, `memorial_role.changed`, `service_request.created`,
`memorial.reported`, `share_asset.generated`.

Each domain operation records its audit event **inside the same transaction** as
its writes (see [`../domain/events.md`](../domain/events.md) and each operation
contract). `recordAuditEvent` is the shared helper.

## Privacy

- Store **references and outcomes**, not payloads: ids, from/to states, a role
  name — never a tribute body, an email address, an IP, or a token in
  `metadata`.
- Audit rows outlive soft-deleted entities (FKs are `on delete set null`), so
  they remain useful for investigation without resurrecting deleted content.
