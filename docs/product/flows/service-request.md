# Flow — Service request

**Status — IMPLEMENTED** (Phase 5L, steps 1–4). `apps/web` `/services` (public
form + honeypot); `apps/family-portal` `/memorials/{id}/services` (pre-filled,
lists the family's own requests). Step 5 (platform-staff triage) is Phase 5M;
the `service_request_received` notification is Phase 5N.

**Actor** anyone — a signed-in family member, or an anonymous visitor, or
someone who doesn't have a memorial yet.
**Goal** ask Evermora for a facilitated service (funeral planning help, printing,
livestream setup, catering, transport, flowers, other) and track the response.

> MVP **captures and routes** the request. Fulfilment / a marketplace is
> [FUTURE](../future-scope.md).

## Steps

| #   | Screen                                                     | Action                                                          | System                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1a  | `apps/web` `/services` or a memorial's "Request help" link | fill the form                                                   | contact name, email, phone, service type, details, optional linked memorial                                                                                                                                                                                                                                                                                                                   |
| 1b  | `apps/family-portal` `/services`                           | fill the form (contact prefilled from profile)                  | same fields; `requested_by` = the signed-in user                                                                                                                                                                                                                                                                                                                                              |
| 2   | Form                                                       | **Submit**                                                      | **`requestFuneralService`** → `service_requests` insert `status='new'`, unassigned (RLS `WITH CHECK`: `status='new'`, no `internal_notes`, `requested_by` null or self); a hidden `website` honeypot silently drops bots; a `memorialId` is attached only if the caller can see it; audit + domain event `service_request.created`; `service_request_received` notification **deferred (5N)** |
| 3   | Confirmation                                               | see "We've received your request"                               | anonymous: that's the end of the visible flow; staff contact them by the email given                                                                                                                                                                                                                                                                                                          |
| 4   | `/services` (signed-in)                                    | track status                                                    | reads the **`my_service_requests`** SECURITY DEFINER view — the requester's own rows, **without** `internal_notes`                                                                                                                                                                                                                                                                            |
| 5   | Platform admin `/service-requests`                         | staff triage                                                    | assign, set status (`in_review` → `contacted` → `scheduled` → `completed` / `declined` / `cancelled`), add internal notes; contact the requester (opens mail client — no in-app messaging in MVP)                                                                                                                                                                                             |
| 6   | `/services` (signed-in)                                    | requester sees the updated status; may **Cancel** their request | `status='cancelled'`                                                                                                                                                                                                                                                                                                                                                                          |

## Events

`SERVICE_REQUEST_SUBMITTED` · audit `service_request.created` · notification
`service_request_received`.

## Edge cases

- **Request before a memorial exists** — `memorial_id` is null; a memorial can
  be linked later.
- **Anonymous requester** — no account; they cannot track it in-app (email
  follow-up is deferred, so staff reach out). `reporter`/`requested_by` cannot
  be spoofed (RLS).
- **Spam** — rate limiting + bot check (PLANNED); staff can mark `declined`.
- **Internal notes leaking** — impossible via the API: the base
  `service_requests` table is staff-only; requesters use the column-free view.
- **Duplicate submit** — a dedupe key (session + type + short window) and rate
  limiting.

## Principles touched

No account required · privacy (internal notes never exposed) · no grief
exploitation (a request in a hard moment is handled by a person, not an
upsell funnel).
