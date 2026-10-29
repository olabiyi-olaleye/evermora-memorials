-- Phase 6A.1 — reserve the new marketing routes.
--
-- `/how-it-works` and `/features` become real pages in apps/web. Like every
-- other root-level platform route they must never be claimable as a memorial
-- slug — enforced in the DB (this table + the `memorial_slugs_validate`
-- trigger) as well as the routing layer (`apps/web/src/lib/reserved-routes.ts`).

insert into reserved_slugs (slug, category, note)
values
  ('how-it-works', 'marketing', 'Marketing route (apps/web /how-it-works).'),
  ('features', 'marketing', 'Marketing route (apps/web /features).')
on conflict (slug) do nothing;
