# requestFuneralService

**Status — IMPLEMENTED** (Phase 5L). Executable, unit- and integration-tested.

**Purpose** — Let a family (or a not-yet-registered person) ask Evermora for a
facilitated service — funeral planning help, printing, livestream, catering,
transport, flowers, other.

**As built** — no auth required. `contactName` / `contactPhone` via `sanitizeLine`,
`details` via `sanitizePlainText`. A hidden `website` honeypot silently discards
bot submissions (`{ discarded: true }`, no row). A `memorialId` is attached only
when the caller can actually see that memorial (RLS `findById`) — so a friend
can enquire on a public memorial's behalf, but a private-memorial id from a
stranger is dropped, not failed. `apps/web` `/services` (public form) and
`apps/family-portal` `/memorials/{id}/services` (pre-filled, lists the family's
own requests via `my_service_requests`). Platform-staff handling is Phase 5M;
`service_request_received` notification recording is Phase 5N.

**Business responsibility** — Capture the enquiry and route it to platform
staff; it may arrive **before** a memorial exists.

## Caller context / Input / Output

|        |                                                                                                                                                                                              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caller | **anyone**, including an anonymous visitor                                                                                                                                                   |
| Input  | `contactName` (1–160), `contactEmail`, `contactPhone?`, `serviceType` (`funeral_planning`\|`printing`\|`livestream`\|`catering`\|`transport`\|`flowers`\|`other`), `details?`, `memorialId?` |
| Output | `{ serviceRequestId, status: "new" }`                                                                                                                                                        |

## Authentication / Authorization

- No authentication required.
- If `ctx.userId` is set, `requested_by` = `ctx.userId`; input cannot set
  `requested_by` to someone else (RLS `service_requests_insert_public`
  `WITH CHECK requested_by is null or requested_by = auth.uid()`).
- `internal_notes` / `assigned_to` / non-`new` status cannot be set on creation
  (RLS `WITH CHECK`).

## Validation / Invariants / Preconditions

- `contactName` + `contactEmail` required and valid.
- `memorialId` (if given) must resolve; the requester need not be a member (a
  friend may request on the family's behalf).
- Created as `status='new'`, unassigned.
- **Rate limit** (Phase 5O) — 5 enquiries per 30 minutes from one IP,
  **global** (a `memorialId` is optional — an enquiry can precede a memorial,
  so there's nothing to scope the count by). Backed by
  `recent_service_requests_from_ip` (SECURITY DEFINER) and the private
  `service_requests.submitted_ip` column.

## Database interactions / Transaction

`insert into service_requests (…, status='new')` + audit row, one transaction.

## Side effects / Events

- **Domain event** `service_request.created` `{ serviceRequestId, serviceType }`.
- **Audit** `service_request.created` (`actor_kind` = `user` or `anonymous`).
- **Notification** `service_request_received` (in-app) to every platform-admin
  account, via `notifyPlatformStaff` (Phase 5N).

## Errors

`ValidationError` (contact fields) · `RateLimitedError` · `internal`.

## Idempotency

Not itself deduplicated beyond the per-IP rate limit above — a genuine
resubmission (different browser tab, retried after a network error) still
gets through within the window; a dedupe key is a possible future refinement.

## Security considerations

- The **requester** reads their own request via the `my_service_requests`
  SECURITY DEFINER view — **without** `internal_notes` or `submitted_ip`. The
  base `service_requests` table is readable only by platform staff / the
  assignee.
- `submitted_ip` (Phase 5O) exists only for the rate-limit count — it is never
  read back by the domain, never exposed via `my_service_requests`, and the
  base table itself is staff/assignee-only.

## Related

Entities: `service_requests`, `notifications`. Flow:
[service request](../../product/flows/service-request.md).
