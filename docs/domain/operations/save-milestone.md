# saveMilestone

**Status** — done IMPLEMENTED (Phase 5E): `packages/domain/src/operations/save-milestone.ts`, unit + integration tested.

**Purpose** — Create or update one dated milestone on the memorial timeline.

## Caller context / Input / Output

|        |                                                                                                                                                                                                    |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caller | authenticated family member with `story.edit` or a platform admin                                                                                                                                  |
| Input  | `memorialId`, `id?`, `year?` (1–9999), `onDate?` (`YYYY-MM-DD`), `title` (1–200), `description?` (≤1000), `visibility` (default `inherit`), `status` (`draft` \| `published`, default `published`) |
| Output | `{ milestone, created }`                                                                                                                                                                           |

A `year` **or** an `onDate` is required. When `onDate` is given, `year` is
derived from it (and a conflicting explicit `year` is a `ValidationError`).
The DB `milestones_year_matches_date` CHECK enforces the same invariant.

## Authorization / Side effects / Errors

As [saveStorySection](./save-story-section.md) — `story.edit`, RLS
`milestones_write_editors`, not `suspended`/`archived`. Audit
`milestone.created` / `milestone.updated`.

## Related operations

- **`removeMilestone`** (`remove-milestone.ts`) — soft-delete. Audit `milestone.removed`.
- **`reorderMilestones`** (`reorder-milestones.ts`) — explicit `display_order`
  within a year (the public timeline sorts by `year` first, then
  `display_order`).

## Milestones vs story sections

A milestone is a single dated point (born, graduated, married, retired); a
story section is prose. The public IA lists them separately. Both use the
`story` section-visibility toggle and the `story.edit` permission.

## Related

Entities: `milestones` (table added in migration `20260902145050_milestones.sql`).
