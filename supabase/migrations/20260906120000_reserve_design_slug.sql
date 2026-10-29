-- Evermora — Phase 6A.0 (design system)
--
-- The `@evermora/ui` component catalogue lives at `/design` inside
-- `apps/platform-admin` — staff-authenticated and `noindex`. Reserve the word
-- so it can never become a memorial slug, mirrored in the routing layer
-- (`apps/web/src/lib/reserved-routes.ts`).

insert into reserved_slugs (slug, category, note)
values ('design', 'app', 'Internal design-system catalogue (platform-admin /design).')
on conflict (slug) do nothing;
