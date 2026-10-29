-- Evermora — memorial gender (memorial-page layout redesign, cont'd)
--
-- Small, closed, product-owned value set → an enum, per this schema's own
-- convention (`0002 · Enumerated types`). Null covers both "never set" and
-- "prefer not to say" identically — every existing memorial, and any family
-- that picks "Prefer not to say", renders exactly as today. Used today only
-- to choose "How you knew him" / "her" / "them" on the tribute form; nothing
-- else on the public site currently phrases anything about the deceased with
-- a gendered or neutral pronoun.

create type memorial_gender as enum ('male', 'female');

alter table memorials add column gender memorial_gender;

comment on column memorials.gender is 'Optional. Null = not set / prefer not to say — same rendering either way. Drives pronoun-aware copy (e.g. the tribute form''s "How you knew ___" label).';
