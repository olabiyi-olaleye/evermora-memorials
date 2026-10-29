-- Evermora — reserved marketing slugs (Phase 6A.1)
--
-- `/how-it-works` and `/features` become real apps/web marketing routes; the
-- 20260909100000_reserve_marketing_slugs migration must make them unclaimable
-- as memorial slugs, enforced by app.memorial_slugs_validate().
begin;
select plan(4);

-- The migration rows exist.
select is(
  (select count(*)::int from reserved_slugs where slug in ('how-it-works', 'features')),
  2,
  'how-it-works and features are in reserved_slugs'
);

select is(
  (select category from reserved_slugs where slug = 'how-it-works'),
  'marketing',
  'how-it-works is categorised as a marketing route'
);

-- The validation trigger rejects them as memorial slugs (e1 is a seeded memorial).
select throws_ok(
  $$ insert into memorial_slugs (memorial_id, slug, is_canonical)
     values ('e1000000-0000-4000-a000-000000000001', 'how-it-works', false) $$,
  '23514', null,
  'a memorial slug of "how-it-works" is rejected'
);

select throws_ok(
  $$ insert into memorial_slugs (memorial_id, slug, is_canonical)
     values ('e1000000-0000-4000-a000-000000000001', 'features', false) $$,
  '23514', null,
  'a memorial slug of "features" is rejected'
);

select * from finish();
rollback;
