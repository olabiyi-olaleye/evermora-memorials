# Design system

**LOCKED approach** (architecture spec §25): an **owned**, shadcn-style component
architecture — not a heavy black-box library. Components live in
`@evermora/ui`, built with Tailwind and accessible headless primitives (Radix)
where justified. Objectives: code ownership, accessibility, customisation,
consistency, minimal vendor lock-in.

Status: **foundation only** — `@evermora/ui` ships a `Button` primitive and
`cn()`. The two visual systems below are **DEFERRED** (design work).

## Two visual systems, one component foundation

### Public memorial — `apps/web`

Premium · editorial · quiet · respectful · timeless.

- **Portrait-led.** The person's photograph is the hero; the UI recedes.
- Serif or refined display face for headings; a highly readable sans-serif for
  body at a comfortable measure (~66ch) and generous line-height.
- Generous whitespace; restrained chrome; few, deliberate colours; no borders
  where space will do.
- No dashboards, cards-grids, badges, progress bars, or SaaS marketing
  patterns. **The public memorial must not look like a generic SaaS
  dashboard.**
- Motion is gentle or absent; honours `prefers-reduced-motion`.
- Works beautifully at 360px wide first
  ([responsive-rules.md](./responsive-rules.md)).

### Family / admin — `apps/family-portal`, `apps/platform-admin`

Calm · functional · guided · accessible.

- Dashboard patterns are fine here: sidebars, tables, forms, filters, empty
  states, wizards.
- Still calm — muted palette, clear hierarchy, plain language, no gamification.
- Guided: the memorial-creation and moderation flows lead the user step by
  step ([../product/flows/](../product/flows/)).
- Shares the **same `@evermora/ui` primitives and tokens** as the public site —
  consistency of buttons, inputs, focus states, spacing scale.

## `@evermora/ui` responsibilities

- Primitives: button, input, textarea, select, checkbox/radio, dialog/modal,
  popover, tooltip, toast/feedback, tabs, form field + error, skeleton/loading,
  avatar, badge (functional only).
- Typography and layout primitives; the shared **design tokens** (colour,
  spacing, radius, typography scale) as Tailwind theme + CSS variables so both
  visual systems draw from one source.
- Accessible by default — focus-visible rings, labels, roles, contrast
  ([accessibility-architecture.md](./accessibility-architecture.md)).
- **No memorial-specific business logic.** A `TributeCard` that knows moderation
  rules belongs in the app, not here.

## Tokens (to be defined with the design work)

Colour (neutral-led, one restrained accent), spacing scale, radius, typography
scale + families, elevation, motion durations/easings, breakpoints. Light and
dark where it serves the content (the memorial itself may be committed to a
single, considered treatment).

## Current state

`Button` — variants `primary | secondary | ghost`, sizes `sm | md | lg`,
focus-visible ring, disabled handling. Deliberately minimal; the full system
arrives with the design phase.
