# updateMemorialFeatures

**Status** — done IMPLEMENTED (Phase 5C): `packages/domain/src/operations/update-memorial-features.ts`, unit + integration tested.

**Purpose** — Toggle which product capabilities a memorial exposes.

**Business responsibility** — Apply a partial update to the fixed set of
`feature_settings` toggles the family can control from the "Customize" surface.

## Caller context / Input / Output

|        |                                                                                                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caller | authenticated family member with `memorial.edit` (owner / admin / content_editor) or a platform admin                                                                        |
| Input  | `memorialId`, plus any of `tributesEnabled`, `tributeModerationEnabled`, `photoContributionsEnabled`, `candlesEnabled`, `funeralEnabled`, `updatesEnabled`, `sharingEnabled` |
| Output | the full `FeatureSettingsRow` after the update                                                                                                                               |

`guestbookEnabled`, `qrCodeEnabled`, and `visitorAnalyticsEnabled` are **not**
editable here (managed elsewhere / later phases).

## Authentication / Authorization

- `UnauthenticatedError` if `ctx.userId` is null.
- `ForbiddenError` unless the caller has `memorial.edit` or `ctx.isPlatformAdmin`.
- RLS `feature_settings_update` re-checks `memorial.edit` underneath.

## Validation / Invariants / Preconditions

- At least one editable key must be present.
- Only keys whose value actually differs from the stored row are written; a
  patch that changes nothing is a no-op with **no audit row**.
- The memorial must not be `suspended`.

## Database interactions / Transaction

One transaction: load memorial + role → read current `feature_settings` →
`update feature_settings` with the true deltas → audit row (only when something
changed).

## Side effects / Events

- **Audit** `memorial.features_changed`, metadata `{ changed: [keys] }`.
- **Domain event** none.
- **Notification** none.

## Errors

`UnauthenticatedError` · `ForbiddenError` · `MemorialNotFoundError` ·
`MemorialInvalidStateError` (suspended) · `ValidationError` (empty patch) ·
`internal` (missing settings row).

## Idempotency

Idempotent — re-sending the same toggles is a no-op.

## Security considerations

The editable set is a hard-coded allow-list; unknown keys are rejected by the
input schema (`.strict()`). Turning tributes off does not delete existing
tributes — it only hides the submission path.

## Related

Entities: `feature_settings`.
Docs: [feature-settings-architecture.md](../../architecture/feature-settings-architecture.md).
