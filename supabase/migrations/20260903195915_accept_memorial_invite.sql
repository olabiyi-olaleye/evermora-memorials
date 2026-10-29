-- Evermora — Phase 5K · family access
-- accept_memorial_invite — the invitee claims a pending invitation.
--
-- A pending invite has `profile_id IS NULL`, so the invitee cannot see or update
-- the row through the `memorial_memberships` RLS policies. This SECURITY DEFINER
-- function is the only path: it verifies the caller's *authenticated* email
-- (from the JWT, not input) against `invited_email`, then links the membership
-- to the caller and activates it. It writes its own audit row.

create or replace function public.accept_memorial_invite(membership uuid)
returns table (memorial_id uuid, role memorial_role)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  rec         record;
  caller_id   uuid := auth.uid();
  caller_mail text := lower(nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), ''));
begin
  if caller_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select m.* into rec
  from public.memorial_memberships m
  where m.id = membership
    and m.status = 'invited'
    and m.profile_id is null
    and caller_mail is not null
    and lower(m.invited_email) = caller_mail
  for update;

  if not found then
    raise exception 'invitation not found or not addressed to you'
      using errcode = 'P0002';
  end if;

  -- Guard against a stale invite for someone who already joined another way.
  if exists (
    select 1 from public.memorial_memberships x
    where x.memorial_id = rec.memorial_id and x.profile_id = caller_id
  ) then
    raise exception 'you are already a member of this memorial' using errcode = '23505';
  end if;

  update public.memorial_memberships
  set profile_id = caller_id,
      status = 'active',
      accepted_at = now()
  where id = membership;

  insert into public.audit_logs
    (actor_profile_id, actor_kind, action, entity_type, entity_id, memorial_id, metadata)
  values
    (caller_id, 'user', 'memorial_admin.accepted', 'memorial_membership', membership,
     rec.memorial_id, jsonb_build_object('role', rec.role));

  return query select rec.memorial_id, rec.role;
end;
$$;

grant execute on function public.accept_memorial_invite(uuid) to authenticated;

-- A signed-in user must be able to look up an invite by id to render the accept
-- page. This companion returns only non-sensitive fields and only when the
-- invite is genuinely addressed to the caller's verified email.
create or replace function public.memorial_invite_preview(membership uuid)
returns table (memorial_id uuid, memorial_name text, role memorial_role, invited_by_name text)
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select
    m.id,
    m.full_name,
    mm.role,
    (select p.display_name from public.profiles p where p.id = mm.invited_by)
  from public.memorial_memberships mm
  join public.memorials m on m.id = mm.memorial_id
  where mm.id = membership
    and mm.status = 'invited'
    and mm.profile_id is null
    and lower(mm.invited_email) = lower(nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), ''))
    and m.deleted_at is null;
$$;

grant execute on function public.memorial_invite_preview(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Ownership transfer.
--
-- The `memberships_guard_owner` trigger blocks demoting the last active owner,
-- and the `memorial_memberships_one_active_owner` partial unique index blocks
-- two active owners at once — so a transfer can only happen atomically inside a
-- trusted path. This SECURITY DEFINER function is that path: it checks the
-- caller is the current owner (or platform admin), sets a transaction-local
-- flag the guard honours, then demotes-then-promotes in one transaction.
-- ---------------------------------------------------------------------------
create or replace function app.memberships_guard_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if not app.caller_is_end_user()
     or current_setting('app.owner_transfer', true) = 'on' then
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

create or replace function public.transfer_memorial_ownership(target_memorial uuid, new_owner uuid)
returns table (previous_owner uuid, promoted_owner uuid)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  prev uuid;
begin
  if not (app.has_memorial_permission(target_memorial, 'memorial.delete') or app.is_platform_admin()) then
    raise exception 'only the current owner can transfer ownership' using errcode = '42501';
  end if;

  select profile_id into prev
  from public.memorial_memberships
  where memorial_id = target_memorial and role = 'owner' and status = 'active';
  if prev is null then
    raise exception 'this memorial has no active owner' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.memorial_memberships
    where memorial_id = target_memorial and profile_id = new_owner and status = 'active'
  ) then
    raise exception 'the new owner must already be an active member' using errcode = 'P0002';
  end if;

  if prev = new_owner then
    raise exception 'that person is already the owner' using errcode = '23505';
  end if;

  perform set_config('app.owner_transfer', 'on', true);
  update public.memorial_memberships set role = 'admin'
   where memorial_id = target_memorial and role = 'owner' and status = 'active';
  update public.memorial_memberships set role = 'owner', status = 'active'
   where memorial_id = target_memorial and profile_id = new_owner;
  perform set_config('app.owner_transfer', 'off', true);

  return query select prev, new_owner;
end;
$$;

grant execute on function public.transfer_memorial_ownership(uuid, uuid) to authenticated;
