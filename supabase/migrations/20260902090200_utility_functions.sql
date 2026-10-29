-- Evermora — Phase 2 data foundation
-- 0003 · Generic utility functions and triggers

-- ---------------------------------------------------------------------------
-- set_updated_at — keep an `updated_at` column current on UPDATE.
-- Attached per-table in each table's migration.
-- ---------------------------------------------------------------------------
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- normalize_slug — lowercase, trim, collapse internal whitespace to hyphens.
-- Pure text hygiene; validity is enforced separately by slug_is_valid().
-- ---------------------------------------------------------------------------
create or replace function app.normalize_slug(raw text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           regexp_replace(lower(btrim(coalesce(raw, ''))), '\s+', '-', 'g'),
           '-{2,}', '-', 'g'
         );
$$;

-- ---------------------------------------------------------------------------
-- slug_is_valid — the authoritative slug grammar (§7 / §11).
--   * 3..63 characters
--   * lowercase ASCII letters, digits, single hyphens
--   * no leading / trailing / doubled hyphen
--   * at least one letter (rejects pure-numeric slugs)
--   * no encoded-path / traversal characters (guaranteed by the charset)
-- ---------------------------------------------------------------------------
create or replace function app.slug_is_valid(candidate text)
returns boolean
language sql
immutable
as $$
  select candidate is not null
     and length(candidate) between 3 and 63
     and candidate ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     and candidate ~ '[a-z]';
$$;

comment on function app.slug_is_valid(text) is
  'Authoritative Evermora memorial-slug grammar. Enforced by DB triggers, not just the UI.';
