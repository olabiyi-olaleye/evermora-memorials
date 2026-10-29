-- Evermora — Phase 2 data foundation
-- 0021 · Integrity guards enforced regardless of caller
--
-- RLS decides *who* may write a row; these triggers constrain *what* the row
-- may become, closing gaps RLS cannot express (column-level rules, invariants).

-- ---------------------------------------------------------------------------
-- Which callers are subject to these guards: an authenticated END USER acting
-- through the Data API (they carry a JWT `sub`). The service_role key, the
-- migration/seed superuser, and background jobs carry no `sub` and are trusted
-- — the domain layer owns their checks. NOTE: this must not depend on
-- `current_user`, which becomes the function owner inside SECURITY DEFINER.
-- ---------------------------------------------------------------------------
create or replace function app.caller_is_end_user()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null;
$$;

-- ---------------------------------------------------------------------------
-- profiles: only a platform admin may change is_platform_admin via the Data API.
-- ---------------------------------------------------------------------------
create or replace function app.profiles_guard_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if tg_op = 'UPDATE'
     and new.is_platform_admin is distinct from old.is_platform_admin
     and app.caller_is_end_user()
     and not app.is_platform_admin() then
    raise exception 'is_platform_admin may only be changed by platform administrators'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_admin_flag
  before update on profiles
  for each row execute function app.profiles_guard_admin_flag();

-- ---------------------------------------------------------------------------
-- memorials: the creator becomes the first active OWNER automatically.
-- ---------------------------------------------------------------------------
create or replace function app.memorials_grant_creator_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if new.created_by is not null then
    insert into public.memorial_memberships
      (memorial_id, profile_id, role, status, accepted_at)
    values
      (new.id, new.created_by, 'owner', 'active', now())
    on conflict (memorial_id, profile_id) where profile_id is not null
      do nothing;
  end if;
  return new;
end;
$$;

create trigger memorials_grant_creator_owner
  after insert on memorials
  for each row execute function app.memorials_grant_creator_owner();

-- ---------------------------------------------------------------------------
-- memorials: soft-delete / hard-delete require the owner-only 'memorial.delete'
-- permission; platform admins may set 'suspended'/'archived'/'deleted'.
-- ---------------------------------------------------------------------------
create or replace function app.memorials_guard_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if not app.caller_is_end_user() then
    return new;
  end if;

  -- Setting deleted_at or status='deleted'
  if (new.deleted_at is not null and old.deleted_at is null)
     or (new.status = 'deleted' and old.status <> 'deleted') then
    if not (app.has_memorial_permission(new.id, 'memorial.delete') or app.is_platform_admin()) then
      raise exception 'deleting a memorial requires owner (memorial.delete) or platform admin'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- Only platform admins may move a memorial in/out of 'suspended'.
  if (new.status = 'suspended') is distinct from (old.status = 'suspended')
     and not app.is_platform_admin() then
    raise exception 'only platform administrators may suspend or unsuspend a memorial'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger memorials_guard_lifecycle
  before update on memorials
  for each row execute function app.memorials_guard_lifecycle();

-- ---------------------------------------------------------------------------
-- memorial_memberships: ownership is single and only moves via a deliberate
-- transfer. Block casual creation/removal of the active owner row.
-- ---------------------------------------------------------------------------
create or replace function app.memberships_guard_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if not app.caller_is_end_user() then
    return coalesce(new, old);
  end if;

  -- Prevent removing / demoting the last active owner without a replacement.
  if tg_op in ('UPDATE', 'DELETE')
     and old.role = 'owner' and old.status = 'active'
     and not (tg_op = 'UPDATE' and new.role = 'owner' and new.status = 'active') then
    if (select count(*) from public.memorial_memberships
        where memorial_id = old.memorial_id and role = 'owner' and status = 'active') <= 1 then
      raise exception 'cannot remove the only active owner; transfer ownership first'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- A member may accept their own invitation (invited -> active) but not
  -- change their own role.
  if tg_op = 'UPDATE' and new.profile_id = auth.uid() and old.profile_id = auth.uid() then
    if new.role is distinct from old.role and not app.has_memorial_permission(new.memorial_id, 'admins.manage') then
      raise exception 'you cannot change your own role' using errcode = 'insufficient_privilege';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger memberships_guard_owner
  before update or delete on memorial_memberships
  for each row execute function app.memberships_guard_owner();
