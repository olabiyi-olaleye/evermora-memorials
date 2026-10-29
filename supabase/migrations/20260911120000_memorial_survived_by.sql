-- Evermora — "Survived by" (memorial-page layout redesign)
--
-- A short, free-text line naming who a person is survived by (e.g. "Wives,
-- Children, Grand Children, and Great Grand Children."), edited on the same
-- Basic Information screen as `headline`, and shown in the hero identity
-- block, right after the headline. Same shape as `headline` — nullable,
-- family-authored, no structure — not the dormant `memorial_people` table,
-- which models individually named people and isn't wired into the app.

alter table memorials add column survived_by text;

alter table memorials add constraint memorials_survived_by_len
  check (survived_by is null or char_length(survived_by) <= 500);

comment on column memorials.survived_by is 'Free-text "survived by" line shown in the hero, under the headline. Same editing/visibility rules as headline.';
