# setMemorialModeration · resolveReport · updateServiceRequest

**Status — IMPLEMENTED** (Phase 5M). Executable, unit- and integration-tested.
The platform-staff moderation surface, driven from `apps/platform-admin`.

**Caller** — every one requires `caller.isPlatformAdmin`. RLS re-checks
`app.is_platform_admin()` underneath, and the `memorials_guard_lifecycle`
trigger backstops suspension. No memorial-role permission is involved — staff
act across every memorial without being a member.

## setMemorialModeration

|        |                                                           |
| ------ | --------------------------------------------------------- |
| Input  | `{ memorialId, action: "suspend" \| "restore", reason? }` |
| Output | `{ memorialId, status }`                                  |

- **suspend** → `status = 'suspended'`, `suspended_at = now()`,
  `suspended_reason` (sanitised). Already suspended → no-op.
  `app.can_read_memorial` immediately hides it from the public; the family sees a
  "suspended by Evermora" state and cannot edit
  ([`requireMemorialPermission`](./create-memorial.md) rejects a suspended memorial).
- **restore** → back to `'published'` if it has a `published_at`, else `'draft'`;
  clears the suspension stamps. Not suspended → `ConflictError { reason: "not_suspended" }`.
- Audit `memorial.suspended` / `memorial.restored` (`actor_kind = platform_admin`).

## resolveReport

|        |                                                                         |
| ------ | ----------------------------------------------------------------------- |
| Input  | `{ reportId, status: "reviewing" \| "actioned" \| "dismissed", note? }` |
| Output | `{ report }`                                                            |

`reviewing` is a non-terminal triage state. `actioned` / `dismissed` are
terminal — they stamp `resolved_by` (the acting staffer) and `resolved_at`.
`note` (sanitised) is stored on `resolution_note`. Audit `report.reviewed`.
Actioning a tribute report still needs a separate
[`hideTribute`](./moderate-tribute.md) call.

## updateServiceRequest

|        |                                                                 |
| ------ | --------------------------------------------------------------- |
| Input  | `{ requestId, status?, assignToMe?, unassign?, internalNote? }` |
| Output | `{ request }`                                                   |

Move the request through `new → in_review → contacted → scheduled → completed`
(or `declined` / `cancelled` — these also set `resolved_at`). `assignToMe` sets
`assigned_to` to the caller; `unassign` clears it. `internalNote` (sanitised) is
**never** exposed to the requester — they read the column-free
`my_service_requests` view. Audit `service_request.updated`.

## Errors

`unauthenticated` · `forbidden` (not staff) · `not_found` · `validation` ·
`conflict` · `internal`.

## Related

Entities: `memorials`, `reports`, `service_requests`, `audit_logs`. Flow:
[platform admin](../../product/flows/platform-admin.md).
