-- Evermora — anonymous tribute self-edit.
--
-- A visitor has no account, so "prove this is your tribute" can only work via
-- a secret generated at submission time and handed back once — never through
-- a normal read (same discipline as `author_email`). Editing is a mutation of
-- someone's own content, unlike `report_tribute` (anyone may flag any
-- tribute — that can't hurt its author), so it needs real proof of
-- authorship, not just a memorial-visibility check.
--
-- Two SECURITY DEFINER functions carry this, mirroring the existing
-- `resolve_share_token` / `accept_memorial_invite` / `recent_tributes_from_ip`
-- pattern: RLS has no concept of "anonymous token ownership", so these are the
-- only path in, and they trust nothing but the token itself. The actual
-- sanitisation, length checks, moderation-status decision, audit log and
-- moderator notification stay in the domain layer (`editTribute`) — these
-- functions are deliberately thin.

alter table tributes
  add column edit_token uuid not null default extensions.gen_random_uuid();

comment on column tributes.edit_token is
  'PRIVATE — never returned to anon reads except via resolve_tribute_edit_token. The only proof of authorship an anonymous visitor has.';

-- resolve_tribute_edit_token — fetch the current content for pre-filling an
-- edit form (and, internally, for editTribute to re-verify the token before
-- mutating). Returns nothing for an unknown or deleted tribute.
create or replace function public.resolve_tribute_edit_token(token uuid)
returns table (
  id uuid,
  memorial_id uuid,
  status tribute_status,
  author_display_name text,
  author_relationship text,
  message text
)
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select t.id, t.memorial_id, t.status, t.author_display_name, t.author_relationship, t.message
  from public.tributes t
  where t.edit_token = token
    and t.deleted_at is null
  limit 1;
$$;

comment on function public.resolve_tribute_edit_token(uuid) is
  'Fetch a tribute by its private edit token, for pre-filling an edit form. SECURITY DEFINER — anon has no other way to read its own pending/unpublished tribute.';

grant execute on function public.resolve_tribute_edit_token(uuid) to anon, authenticated;

-- apply_tribute_edit — the actual mutation. `new_status` is decided by the
-- caller (editTribute, from feature_settings.tribute_moderation_enabled) —
-- this function does not re-derive it, so that decision lives in exactly one
-- place. Clears prior moderation stamps: an edit is materially new content,
-- a moderator reviewing it should not see a stale note about different text.
create or replace function public.apply_tribute_edit(
  token uuid,
  new_author_display_name text,
  new_author_relationship text,
  new_message text,
  new_status tribute_status
)
returns table (id uuid, memorial_id uuid, status tribute_status, author_display_name text, author_relationship text, message text)
language sql
security definer
set search_path = pg_catalog, public, extensions
as $$
  update public.tributes
  set author_display_name = new_author_display_name,
      author_relationship = new_author_relationship,
      message = new_message,
      status = new_status,
      moderated_by = null,
      moderated_at = null,
      moderation_note = null,
      published_at = case when new_status = 'approved' then now() else null end,
      updated_at = now()
  where edit_token = token
    and deleted_at is null
  returning id, memorial_id, status, author_display_name, author_relationship, message;
$$;

comment on function public.apply_tribute_edit(uuid, text, text, text, tribute_status) is
  'Apply a visitor''s own edit, proven by their private edit token. SECURITY DEFINER — bypasses RLS, which has no concept of anonymous token ownership. Length/sanitisation happen in editTribute before this is called; the table''s own CHECK constraints are the backstop.';

grant execute on function public.apply_tribute_edit(uuid, text, text, text, tribute_status) to anon, authenticated;
