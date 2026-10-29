# Flow — Funeral management

**Status — IMPLEMENTED** (Phase 5H). Family surface at
`/memorials/{id}/funeral`; public rendering in `apps/web` `MemorialView`.

**Actor** `owner`, `admin`, or `content_editor` (`funeral.manage`).
**Goal** publish accurate, structured funeral information that visitors can act
on — added and confirmed over days, **never blocking memorial publication**.

## Preconditions

- The memorial exists (draft or published). `funeral_enabled` (feature toggle,
  default on) is respected by the public page; the domain operations do not gate
  on it.

## What shipped vs. deferred

- **Shipped**: multi-event editor, per-event visibility (`inherit` / `members` /
  `public` / `private`), draft → publish → cancel / complete lifecycle,
  soft-delete, `funeral_planning_status` control, public rendering with a map
  link and a clearly-marked cancelled state, family-side preview.
- **Deferred**: notifications on publish / update / cancel (Phase 5N — no
  `funeral_event_published` / `funeral_event_updated` is sent yet); the
  `FUNERAL_EVENT_VIEWED` visitor analytics event.

## Steps

| #   | Screen                          | Action                                                                                                                           | System                                                                                                                                                                                                                                                            |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Memorial overview → **Funeral** | (arrive)                                                                                                                         | `/memorials/{id}/funeral`; empty state explains events can be added any time                                                                                                                                                                                      |
| 2   | Funeral                         | **Add an event** → pick a type (service of songs / wake / viewing / funeral service / burial / reception / thanksgiving / other) | opens the editor                                                                                                                                                                                                                                                  |
| 3   | Event editor                    | type, title, details, date, start/end time, venue name + address + city, dress code, livestream URL, instructions, visibility    | validates `end_time ≥ start_time` (`{reason:"time_order"}`), URL; **`saveFuneralEvent`** → `funeral_events` row `status='draft'`, `display_order = max+1` (never touches `memorials.status`); audit `funeral_event.created`; domain event `funeral_event.created` |
| 4   | Funeral                         | repeat for each event (multiple structured records — **not** one blob)                                                           | each is its own row with its own visibility and order                                                                                                                                                                                                             |
| 5   | Event row                       | **Publish** an event                                                                                                             | **`publishFuneralEvent`**: `draft \| cancelled → published`; requires `eventDate` (`{reason:"missing_date"}`); sets `published_at`; audit `funeral_event.published`; domain event `funeral_event.published`; `revalidatePath('/memorials/{id}', 'layout')`        |
| 6   | Public memorial                 | visitors see the published event                                                                                                 | shown iff the memorial is readable, the `funeral_events` section is readable, **and** the event's own `visibility` is `inherit`/`public` (RLS `funeral_events_select`, migration `20260902184742`)                                                                |
| 7   | Event editor                    | **edit** a published event (venue moved, time changed)                                                                           | `saveFuneralEvent` with `id` → update in place; audit `funeral_event.updated`                                                                                                                                                                                     |
| 8   | Event row                       | **Mark cancelled** (optional note)                                                                                               | **`cancelFuneralEvent`**: `draft \| published → cancelled`; `cancelled_at`, `cancel_reason`; the row is kept; the public card shows **"Cancelled"** with the note; a cancelled event can be re-published                                                          |
| 9   | Event row                       | **Mark done** after the day                                                                                                      | **`completeFuneralEvent`**: `published → completed`. Family also sets `funeral_planning_status` directly via **`setFuneralPlanningStatus`**; see [post-funeral-legacy.md](./post-funeral-legacy.md)                                                               |

## Events

audit `funeral_event.created` / `.updated` / `.published` / `.cancelled` /
`.completed` / `.removed` · `memorial.funeral_planning_changed` · domain events
`funeral_event.created` / `funeral_event.published` / `funeral_event.cancelled`.
Notifications and `FUNERAL_EVENT_VIEWED` are deferred (see above).

## Edge cases

- **Publishing the memorial with no funeral events** — fully supported; the
  funeral section simply doesn't render.
- **Family wants an event members-only** — set the event's `visibility` to
  `members` (or `private`). §39: the **whole event card** is hidden from
  non-members; there is no field-level hiding. RLS enforces this, not just the
  UI.
- **Livestream** — MVP stores a URL only; hosting is external. A non-URL value is
  rejected by `z.string().url()`.
- **Timezone** — an event may store an explicit `timezone` string; the public
  page currently renders the stored wall-clock time without conversion.
- **Two events overlapping** — allowed (a viewing and a reception can be close);
  no scheduling engine.
- **Cancel after notifications went out** — this is the important one: the
  cancel notification is unmistakable, and the public card stays visible but
  struck-through/"CANCELLED" so a forwarded old link still shows the truth.

## Principles touched

Funeral info never blocks publication (independent `funeral_planning_status`) ·
respectful, structured (not a JSON blob) · privacy (section + per-event
visibility, RLS-enforced) · a cancelled service must never mislead someone into
travelling.
