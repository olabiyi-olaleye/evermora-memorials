# reportTribute

**Status** — done IMPLEMENTED (Phase 5G): `packages/domain/src/operations/report-tribute.ts`, unit + integration tested.

**Purpose** — Anyone (incl. a visitor with no account) flags a tribute for
review. The tribute is untouched — a family moderator or platform staff
decides what happens.

## Caller context / Input / Output

|        |                                                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Caller | anyone; `ctx.userId` is recorded as `reporter_profile_id` when present                                                       |
| Input  | `memorialId`, `tributeId`, `reason` (`report_reason` enum, default `other`), `details?` (≤4000, sanitised), `reporterEmail?` |
| Output | `{ reportId }`                                                                                                               |

## Behaviour

- Writes one `reports` row (`status = 'open'`). RLS `reports_insert_public`
  permits anon.
- `details` is run through `sanitizePlainText` and truncated to 4000 chars.
- **Rate limit** (Phase 5O) — 10 reports per 15 minutes from one IP, **global**
  across memorials (not per-memorial: a report is a safety valve, so the limit
  is deliberately generous — wide enough that raising a handful of genuine
  concerns is never blocked, tight enough to stop automated flooding). Backed
  by `recent_reports_from_ip` (SECURITY DEFINER) and the private
  `reports.submitted_ip` column.
- **Audit** `memorial.reported`, metadata `{ tributeId, reason }`.
- **Domain event** `memorial.reported` `{ memorialId, reportId }`.
- **Notification** `memorial_reported` (in-app) to every platform-admin
  account, via `notifyPlatformStaff` (Phase 5N).

## Errors

`ValidationError` · `NotFoundError` (memorial not visible) · `RateLimitedError` ·
`internal`.

## Related

Entities: `reports`, `tributes`. `reportMemorial` (a report with no
`tribute_id`) shares the table and is a later phase.
