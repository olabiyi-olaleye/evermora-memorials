# reportMemorial

**Purpose** — Let anyone flag a memorial (or a specific tribute) for
impersonation, abuse, privacy violation, inaccuracy, spam, or other concern.

**Business responsibility** — Provide a safe, low-friction abuse channel that
reaches platform staff; the report itself is not public.

## Caller context / Input / Output

|        |                                                                                                                                                                               |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caller | **anyone**, including anonymous                                                                                                                                               |
| Input  | `memorialId?` and/or `tributeId?` (at least one), `reason` (`spam`\|`abuse`\|`impersonation`\|`privacy`\|`inaccurate`\|`other`), `details?`, `reporterEmail?` (for follow-up) |
| Output | `{ reportId, status: "open" }`                                                                                                                                                |

## Authentication / Authorization

- No authentication required.
- `reporter_profile_id` = `ctx.userId` if signed in; input cannot set it to
  another user (RLS `reports_insert_public`).
- `status` / `resolved_by` / `resolved_at` cannot be set on creation.

## Validation / Invariants / Preconditions

- At least one of `memorialId` / `tributeId` present and resolvable
  (`reports_target_present` check).
- `reason` in the enum.
- Created `status='open'`.
- Reporting a tribute may also set that tribute to `reported`
  ([hideTribute](./hide-tribute.md) picks it up), a product rule.

## Database interactions / Transaction

`insert into reports (…, status='open')` (+ optional
`update tributes set status='reported'`) + audit row, one transaction.

## Side effects / Events

- **Domain event** `memorial.reported` `{ reportId, memorialId?, tributeId?, reason }`.
- **Audit** `memorial.reported`.
- **Notification** `memorial_reported` to platform staff; `privacy` /
  `impersonation` reasons may be prioritised.

## Errors

`ValidationError` (no target / bad reason) · `rate_limited` (**PLANNED**) ·
`internal`.

## Idempotency

Repeated identical reports from the same session in a short window are
de-duplicated / rate-limited; each distinct concern is a new row.

## Security considerations

- `reporter_email` is **platform-internal** — column-revoked from the Data API;
  reporters cannot read the `reports` table (they may see "we received your
  report" only).
- No public signal that a memorial has been reported (no counter, no badge) —
  avoids brigading.

## Related

Entities: `reports`, `tributes`, `notifications`. Flows:
[visitor](../../product/flows/visitor.md),
[platform admin](../../product/flows/platform-admin.md).
