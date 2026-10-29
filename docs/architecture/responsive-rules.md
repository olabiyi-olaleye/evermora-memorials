# Responsive rules

**Mobile-first** (LOCKED). Most visitors arrive on a phone from a WhatsApp
link. Status: **IMPLEMENTED** across all four surfaces (Phase 6A). The
"no horizontal scroll" rule is checked by e2e (`e2e/*/responsive.spec.ts`) at
320–1920px on the marketing site and public memorial, and at the
drawer/sidebar (`lg`, 1024px) transition through wide desktop on the family
portal and platform admin.

## Breakpoints (target)

| Name | Min width | Primary use                             |
| ---- | --------- | --------------------------------------- |
| base | 0         | phones — design here first              |
| sm   | 640       | large phones / small tablets            |
| md   | 768       | tablets                                 |
| lg   | 1024      | family-portal desktop (sidebar appears) |
| xl   | 1280      | wide desktop                            |

## Public memorial (`apps/web`)

- **Single column** on mobile: portrait → name + dates → memorial message →
  story → gallery → tributes → funeral info → family updates.
- Content width caps at a readable measure on larger screens; the page never
  becomes a multi-column dashboard.
- **Sticky**: a slim memorial header (name) may stick after scroll; a
  share/contribute affordance may stick at the bottom on mobile. Nothing that
  covers content or nags.
- **Images**: full-bleed portrait option; gallery is a responsive grid
  (1 → 2 → 3 columns); tap opens a lightbox (lazy-loaded JS).
- **WhatsApp entry**: the first paint must be meaningful with zero interaction —
  portrait, name, dates, message visible immediately (see
  [performance-architecture.md](./performance-architecture.md)).
- Touch targets ≥ 44px; tributes/remembrance actions are large and forgiving.

## Family portal (`apps/family-portal`)

- **Mobile**: top bar + slide-in drawer navigation; forms are single-column,
  full-width; the memorial-creation wizard is one step per screen.
- **Desktop (lg+)**: persistent left sidebar (sections: Overview, Story,
  Gallery, Tributes, Funeral, Updates, Access, Privacy, Sharing, Settings);
  content area with a max width; tables become real tables (cards on mobile).
- Draft preview renders the memorial in a device-frame / responsive preview.

## Platform admin (`apps/platform-admin`)

- Desktop-first is acceptable (internal tool) but must remain usable on a
  tablet. Dense tables, keyboard-friendly.

## Cross-cutting

- **Poor network**: skeletons over spinners; optimistic UI only where a
  failure is cheap to reconcile; never block the whole screen on one slow call.
- **`prefers-reduced-motion`**: disable non-essential animation
  ([accessibility-architecture.md](./accessibility-architecture.md)).
- **Orientation**: support both; the gallery lightbox adapts.
- **Fonts**: `font-display: swap`; system-font fallback stack so text is
  readable before the webfont loads.
- **No horizontal scroll** on any breakpoint; wide elements (tables, code)
  scroll within their own container.
