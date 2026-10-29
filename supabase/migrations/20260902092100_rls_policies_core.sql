-- Evermora — Phase 2 data foundation
-- 0022 · RLS policies — identity, memorial, membership, slugs, share resolvers

-- ===========================================================================
-- profiles
-- ===========================================================================
create policy profiles_select_self_or_comember on profiles
  for select to authenticated
  using (
    id = auth.uid()
    or app.is_platform_admin()
    or exists (
      select 1
      from memorial_memberships me
      join memorial_memberships them
        on them.memorial_id = me.memorial_id
      where me.profile_id = auth.uid() and me.status = 'active'
        and them.profile_id = profiles.id and them.status = 'active'
    )
  );

create policy profiles_insert_self on profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_self on profiles
  for update to authenticated
  using (id = auth.uid() or app.is_platform_admin())
  with check (id = auth.uid() or app.is_platform_admin());

-- ===========================================================================
-- memorials
-- ===========================================================================
create policy memorials_select_readable on memorials
  for select to anon, authenticated
  using (app.can_read_memorial(id));

create policy memorials_insert_by_creator on memorials
  for insert to authenticated
  with check (created_by = auth.uid() and status in ('draft', 'published'));

create policy memorials_update_editors on memorials
  for update to authenticated
  using (app.has_memorial_permission(id, 'memorial.edit') or app.is_platform_admin())
  with check (app.has_memorial_permission(id, 'memorial.edit') or app.is_platform_admin());

create policy memorials_delete_owner on memorials
  for delete to authenticated
  using (app.has_memorial_permission(id, 'memorial.delete') or app.is_platform_admin());

-- ===========================================================================
-- memorial_people   (section: family_details)
-- ===========================================================================
create policy memorial_people_select on memorial_people
  for select to anon, authenticated
  using (deleted_at is null and app.can_read_memorial_section(memorial_id, 'family_details'));

create policy memorial_people_write on memorial_people
  for all to authenticated
  using (app.has_memorial_permission(memorial_id, 'memorial.edit'))
  with check (app.has_memorial_permission(memorial_id, 'memorial.edit'));

-- ===========================================================================
-- memorial_memberships
-- ===========================================================================
create policy memberships_select on memorial_memberships
  for select to authenticated
  using (
    profile_id = auth.uid()
    or app.is_memorial_member(memorial_id)
    or app.is_platform_admin()
  );

create policy memberships_insert_admins on memorial_memberships
  for insert to authenticated
  with check (
    app.has_memorial_permission(memorial_id, 'admins.manage')
    and role <> 'owner'                       -- ownership transfer is a dedicated op
  );

create policy memberships_update on memorial_memberships
  for update to authenticated
  using (
    profile_id = auth.uid()                    -- accept own invite
    or app.has_memorial_permission(memorial_id, 'admins.manage')
    or app.is_platform_admin()
  )
  with check (
    profile_id = auth.uid()
    or app.has_memorial_permission(memorial_id, 'admins.manage')
    or app.is_platform_admin()
  );

create policy memberships_delete_admins on memorial_memberships
  for delete to authenticated
  using (
    app.has_memorial_permission(memorial_id, 'admins.manage')
    or app.is_platform_admin()
  );

-- ===========================================================================
-- reserved_slugs   (public read; platform-managed writes)
-- ===========================================================================
create policy reserved_slugs_select_all on reserved_slugs
  for select to anon, authenticated
  using (true);

create policy reserved_slugs_admin_write on reserved_slugs
  for all to authenticated
  using (app.is_platform_admin())
  with check (app.is_platform_admin());

-- ===========================================================================
-- memorial_slugs
-- ===========================================================================
create policy memorial_slugs_select on memorial_slugs
  for select to anon, authenticated
  using (app.can_read_memorial(memorial_id) or app.is_memorial_member(memorial_id));

create policy memorial_slugs_insert_editors on memorial_slugs
  for insert to authenticated
  with check (app.has_memorial_permission(memorial_id, 'memorial.edit') or app.is_platform_admin());

create policy memorial_slugs_update_editors on memorial_slugs
  for update to authenticated
  using (app.has_memorial_permission(memorial_id, 'memorial.edit') or app.is_platform_admin())
  with check (app.has_memorial_permission(memorial_id, 'memorial.edit') or app.is_platform_admin());

-- Historical aliases are never recycled: only platform admins may hard-delete.
create policy memorial_slugs_delete_admin on memorial_slugs
  for delete to authenticated
  using (app.is_platform_admin());

-- ===========================================================================
-- share_resolvers   (QR / print indirection)
-- ===========================================================================
create policy share_resolvers_select_members on share_resolvers
  for select to authenticated
  using (app.is_memorial_member(memorial_id) or app.is_platform_admin());

create policy share_resolvers_write_editors on share_resolvers
  for all to authenticated
  using (app.has_memorial_permission(memorial_id, 'memorial.edit') or app.is_platform_admin())
  with check (app.has_memorial_permission(memorial_id, 'memorial.edit') or app.is_platform_admin());
