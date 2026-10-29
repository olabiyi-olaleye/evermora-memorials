# Accessibility architecture

Evermora is used by grieving people of every age and ability, often on a phone,
often in distress. Accessibility is a requirement, not a polish pass.

Status (Phase 5P): **partially IMPLEMENTED**. `@evermora/ui` ships `Button`
(focus-visible rings) and `SkipLink`; every app has a skip-to-content link and
`<main id="main-content">`; the authenticated apps mark the active nav item
with `aria-current="page"`; the public gallery uses a meaningful `alt`
fallback. An **axe-core gate runs in the Playwright e2e suite** against the
screens named below and is green. The manual screen-reader pass and the
per-component RTL axe assertions remain to do.

## Standard

Target **WCAG 2.2 AA** for all three apps. The public memorial experience should
aim higher where feasible (it is read, not operated).

## Rules

- **Semantic HTML first.** Real `<button>`, `<a>`, `<nav>`, `<main>`, headings
  in order. ARIA only to fill genuine gaps.
- **Keyboard**: every interactive element reachable and operable; visible focus
  (`focus-visible` ring, already in the `Button` primitive); logical tab order;
  no keyboard traps; skip-to-content link on every page.
- **Screen readers**: labelled controls, described form errors
  (`aria-describedby`), `aria-live` for async results (tribute submitted,
  saved), landmark regions, accurate `alt` text — memorial photos require
  meaningful `alt` (the `media.alt_text` column exists for this).
- **Colour & contrast**: 4.5:1 text / 3:1 large text & UI; never colour-only
  status (pair with icon/text — e.g. tribute `pending`/`approved`).
- **Motion**: honour `prefers-reduced-motion` — no autoplaying carousels, no
  parallax, gentle or no transitions on the memorial.
- **Targets**: ≥ 44×44 px touch targets (the visitor flow is thumb-driven).
- **Text**: resizable to 200% without loss; generous line-height; the memorial
  body uses a readable measure (~66ch).
- **Forms**: label every field, associate errors, don't rely on placeholder as
  label, preserve input on error (visitor tribute form especially).
- **Media**: captions/transcripts for video; controls, not autoplay with sound.
- **Language**: `<html lang>` set (`en` today; i18n is future scope).

## Testing

- **IMPLEMENTED** — `axe-core` (`@axe-core/playwright`) scans every redesigned
  primary screen against WCAG 2.1 A/AA on every e2e run (`e2e/*/a11y.spec.ts`):
  the public memorial + tribute form, every marketing page, the services form
  (`apps/web`); sign-in, the dashboard, a memorial overview, and its Basic
  information / Tributes / Family access / Share & QR screens, and the
  memorial creation wizard (`apps/family-portal`); the command centre,
  Memorials, Reports (moderation queue), and Service requests
  (`apps/platform-admin`). The Playwright suite runs in CI
  ([ci-cd-architecture.md](./ci-cd-architecture.md)). Currently zero
  violations.
- **IMPLEMENTED** — RTL component tests query by role/label (the convention;
  `@evermora/ui` `SkipLink` / `Button` have tests).
- **Still to do** — per-component axe assertions in Vitest/RTL; a manual
  keyboard + screen-reader pass (VoiceOver / NVDA). Automated axe catches only
  a subset of WCAG (labels, contrast, ARIA misuse, alt); logical tab order,
  focus management, and reading order still need a human.

## Design-system responsibility

`@evermora/ui` primitives ship accessible-by-default (focus, labels, roles,
contrast tokens) so product screens inherit correctness — see
[design-system.md](./design-system.md).
