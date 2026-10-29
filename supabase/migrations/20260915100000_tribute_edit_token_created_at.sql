-- resolve_tribute_edit_token now also returns created_at, so a visitor's own
-- (possibly still-pending) tribute can be shown with the same date styling
-- as everyone else's in the public Tributes list — not just used to pre-fill
-- the edit form, which is all it was needed for before.
--
-- Postgres won't let CREATE OR REPLACE change a function's return shape, so
-- this drops and recreates it; everything else (SECURITY DEFINER, the
-- comment, the grant) is unchanged from the original migration.

drop function if exists public.resolve_tribute_edit_token(uuid);

create function public.resolve_tribute_edit_token(token uuid)
returns table (
  id uuid,
  memorial_id uuid,
  status tribute_status,
  author_display_name text,
  author_relationship text,
  message text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select t.id, t.memorial_id, t.status, t.author_display_name, t.author_relationship,
         t.message, t.created_at
  from public.tributes t
  where t.edit_token = token
    and t.deleted_at is null
  limit 1;
$$;

comment on function public.resolve_tribute_edit_token(uuid) is
  'Fetch a tribute by its private edit token, for pre-filling an edit form and for showing a visitor their own (possibly pending) tribute in the public list. SECURITY DEFINER — anon has no other way to read its own pending/unpublished tribute.';

grant execute on function public.resolve_tribute_edit_token(uuid) to anon, authenticated;
