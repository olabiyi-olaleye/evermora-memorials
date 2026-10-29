-- Evermora — Phase 2 data foundation
-- 0007 · Authorization helper functions
--
-- These encode the *database* layer of the three-layer model
-- (UI -> domain -> RLS). RLS policies call these; they are the final boundary.
--
-- All are SECURITY DEFINER with a locked search_path so they can read
-- membership/profile rows regardless of the caller's own RLS view, without
-- opening a recursion hole in the policies that protect those tables.

-- Current user's profile id (profiles.id == auth.users.id).
create or replace function app.current_profile_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

-- Platform-operations check.
create or replace function app.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_platform_admin
      and p.deleted_at is null
  );
$$;

-- The caller's active role on a memorial, or NULL if they are not an active member.
create or replace function app.memorial_role(target_memorial uuid)
returns public.memorial_role
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select m.role
  from public.memorial_memberships m
  where m.memorial_id = target_memorial
    and m.profile_id = auth.uid()
    and m.status = 'active'
  limit 1;
$$;

-- Is the caller an active member (any role) of the memorial?
create or replace function app.is_memorial_member(target_memorial uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select exists (
    select 1
    from public.memorial_memberships m
    where m.memorial_id = target_memorial
      and m.profile_id = auth.uid()
      and m.status = 'active'
  );
$$;

-- Role -> permission matrix (§9). Returns true when the caller's role on the
-- memorial grants `permission`. Platform admins are intentionally NOT granted
-- family permissions here — platform authority is a separate, explicit path.
create or replace function app.has_memorial_permission(target_memorial uuid, permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  caller_role public.memorial_role := app.memorial_role(target_memorial);
begin
  if caller_role is null then
    return false;
  end if;

  return case caller_role
    when 'owner' then
      true
    when 'admin' then
      permission in (
        'memorial.edit', 'story.edit', 'gallery.manage', 'tributes.moderate',
        'funeral.manage', 'updates.publish', 'admins.manage', 'privacy.manage'
      )
    when 'content_editor' then
      permission in (
        'memorial.edit', 'story.edit', 'gallery.manage', 'funeral.manage', 'updates.publish'
      )
    when 'tribute_moderator' then
      permission in ('tributes.moderate')
    when 'viewer' then
      false
    else
      false
  end;
end;
$$;

comment on function app.has_memorial_permission(uuid, text) is
  'Authoritative role->permission matrix. Known permissions: memorial.edit, story.edit, '
  'gallery.manage, tributes.moderate, funeral.manage, updates.publish, admins.manage, '
  'privacy.manage, billing.manage, memorial.delete. billing.manage & memorial.delete are owner-only.';

-- Can the caller read this memorial at all? (publication + visibility + membership)
create or replace function app.can_read_memorial(target_memorial uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  mem record;
  vis public.memorial_visibility;
begin
  select status, deleted_at into mem
  from public.memorials
  where id = target_memorial;

  if not found or mem.deleted_at is not null then
    return app.is_platform_admin();
  end if;

  -- Members and platform admins can always read (draft/archived/suspended included).
  if app.is_memorial_member(target_memorial) or app.is_platform_admin() then
    return true;
  end if;

  -- Anonymous / non-member: only published memorials that are not private.
  if mem.status <> 'published' then
    return false;
  end if;

  select visibility into vis
  from public.privacy_settings
  where memorial_id = target_memorial;

  -- 'public' and 'anyone_with_link' are both readable by slug; 'private' is not.
  return coalesce(vis, 'private') in ('public', 'anyone_with_link');
end;
$$;

-- Can the caller read a specific section of a memorial? Combines can_read_memorial()
-- with the per-section privacy_settings toggle. `section` is one of:
-- family_details | funeral_events | resting_place | photos | story | updates | documents
create or replace function app.can_read_memorial_section(target_memorial uuid, section text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  sect public.section_visibility;
begin
  if not app.can_read_memorial(target_memorial) then
    return false;
  end if;

  if app.is_memorial_member(target_memorial) or app.is_platform_admin() then
    return true;
  end if;

  execute format(
    'select %I from public.privacy_settings where memorial_id = $1',
    section || '_visibility'
  )
  into sect
  using target_memorial;

  return coalesce(sect, 'members') in ('inherit', 'public');
end;
$$;
