-- Evermora — Phase 2 data foundation
-- 0023 · RLS policies — content, tributes, funeral, updates, remembrance,
--        settings, service requests, notifications, reports, audit

-- ===========================================================================
-- media   (section: photos)
-- ===========================================================================
create policy media_select on media
  for select to anon, authenticated
  using (
    deleted_at is null
    and (
      app.is_memorial_member(memorial_id)
      or (processing_status = 'ready' and app.can_read_memorial_section(memorial_id, 'photos'))
    )
  );

create policy media_write_gallery on media
  for all to authenticated
  using (app.has_memorial_permission(memorial_id, 'gallery.manage'))
  with check (app.has_memorial_permission(memorial_id, 'gallery.manage'));

-- ===========================================================================
-- albums   (section: photos)
-- ===========================================================================
create policy albums_select on albums
  for select to anon, authenticated
  using (
    deleted_at is null
    and (
      app.is_memorial_member(memorial_id)
      or (status = 'published' and app.can_read_memorial_section(memorial_id, 'photos'))
    )
  );

create policy albums_write_gallery on albums
  for all to authenticated
  using (app.has_memorial_permission(memorial_id, 'gallery.manage'))
  with check (app.has_memorial_permission(memorial_id, 'gallery.manage'));

-- ===========================================================================
-- story_sections   (section: story)
-- ===========================================================================
create policy story_sections_select on story_sections
  for select to anon, authenticated
  using (
    deleted_at is null
    and (
      app.is_memorial_member(memorial_id)
      or (status = 'published' and app.can_read_memorial_section(memorial_id, 'story'))
    )
  );

create policy story_sections_write_editors on story_sections
  for all to authenticated
  using (app.has_memorial_permission(memorial_id, 'story.edit'))
  with check (app.has_memorial_permission(memorial_id, 'story.edit'));

-- ===========================================================================
-- tributes
--   * base-table reads: memorial members + platform admins only
--     (anonymous / non-member visitors use the public_tributes view)
--   * inserts: anyone, but only a clean 'pending' row on a memorial that
--     currently accepts tributes
--   * moderation: tributes.moderate permission
-- ===========================================================================
create policy tributes_select_members on tributes
  for select to authenticated
  using (app.is_memorial_member(memorial_id) or app.is_platform_admin());

create policy tributes_insert_public on tributes
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and moderated_by is null
    and moderated_at is null
    and published_at is null
    and deleted_at is null
    and app.can_read_memorial(memorial_id)
    and exists (
      select 1 from feature_settings fs
      where fs.memorial_id = tributes.memorial_id and fs.tributes_enabled
    )
  );

create policy tributes_update_moderators on tributes
  for update to authenticated
  using (app.has_memorial_permission(memorial_id, 'tributes.moderate') or app.is_platform_admin())
  with check (app.has_memorial_permission(memorial_id, 'tributes.moderate') or app.is_platform_admin());

create policy tributes_delete_moderators on tributes
  for delete to authenticated
  using (app.has_memorial_permission(memorial_id, 'tributes.moderate') or app.is_platform_admin());

-- ===========================================================================
-- funeral_events   (section: funeral_events)
-- ===========================================================================
create policy funeral_events_select on funeral_events
  for select to anon, authenticated
  using (
    deleted_at is null
    and (
      app.is_memorial_member(memorial_id)
      or (status = 'published' and app.can_read_memorial_section(memorial_id, 'funeral_events'))
    )
  );

create policy funeral_events_write on funeral_events
  for all to authenticated
  using (app.has_memorial_permission(memorial_id, 'funeral.manage'))
  with check (app.has_memorial_permission(memorial_id, 'funeral.manage'));

-- ===========================================================================
-- family_updates   (section: updates)
-- ===========================================================================
create policy family_updates_select on family_updates
  for select to anon, authenticated
  using (
    deleted_at is null
    and (
      app.is_memorial_member(memorial_id)
      or (status = 'published' and app.can_read_memorial_section(memorial_id, 'updates'))
    )
  );

create policy family_updates_write on family_updates
  for all to authenticated
  using (app.has_memorial_permission(memorial_id, 'updates.publish'))
  with check (app.has_memorial_permission(memorial_id, 'updates.publish'));

-- ===========================================================================
-- remembrance_actions
--   * base-table reads: members only (moderation view); public uses the
--     remembrance_action_counts aggregate view
--   * inserts: anyone, if the memorial is readable and candles are enabled
--   * hide/unhide: tributes.moderate
-- ===========================================================================
create policy remembrance_select_members on remembrance_actions
  for select to authenticated
  using (app.is_memorial_member(memorial_id) or app.is_platform_admin());

create policy remembrance_insert_public on remembrance_actions
  for insert to anon, authenticated
  with check (
    hidden_at is null
    and hidden_by is null
    and app.can_read_memorial(memorial_id)
    and exists (
      select 1 from feature_settings fs
      where fs.memorial_id = remembrance_actions.memorial_id and fs.candles_enabled
    )
  );

create policy remembrance_update_moderators on remembrance_actions
  for update to authenticated
  using (app.has_memorial_permission(memorial_id, 'tributes.moderate') or app.is_platform_admin())
  with check (app.has_memorial_permission(memorial_id, 'tributes.moderate') or app.is_platform_admin());

create policy remembrance_delete_admin on remembrance_actions
  for delete to authenticated
  using (app.is_platform_admin());

-- ===========================================================================
-- feature_settings / privacy_settings
-- ===========================================================================
create policy feature_settings_select on feature_settings
  for select to anon, authenticated
  using (app.can_read_memorial(memorial_id));

create policy feature_settings_update on feature_settings
  for update to authenticated
  using (app.has_memorial_permission(memorial_id, 'memorial.edit') or app.is_platform_admin())
  with check (app.has_memorial_permission(memorial_id, 'memorial.edit') or app.is_platform_admin());

create policy privacy_settings_select on privacy_settings
  for select to anon, authenticated
  using (app.can_read_memorial(memorial_id));

create policy privacy_settings_update on privacy_settings
  for update to authenticated
  using (app.has_memorial_permission(memorial_id, 'privacy.manage') or app.is_platform_admin())
  with check (app.has_memorial_permission(memorial_id, 'privacy.manage') or app.is_platform_admin());

-- ===========================================================================
-- service_requests   (base table: platform staff only; requesters use
--                     the my_service_requests view)
-- ===========================================================================
create policy service_requests_select_staff on service_requests
  for select to authenticated
  using (app.is_platform_admin() or assigned_to = auth.uid());

create policy service_requests_insert_public on service_requests
  for insert to anon, authenticated
  with check (
    status = 'new'
    and assigned_to is null
    and internal_notes is null
    and (requested_by is null or requested_by = auth.uid())
  );

create policy service_requests_update_staff on service_requests
  for update to authenticated
  using (app.is_platform_admin() or assigned_to = auth.uid())
  with check (app.is_platform_admin() or assigned_to = auth.uid());

-- ===========================================================================
-- notifications   (recipient-scoped; rows created server-side / by triggers)
-- ===========================================================================
create policy notifications_select_own on notifications
  for select to authenticated
  using (recipient_profile_id = auth.uid() or app.is_platform_admin());

create policy notifications_update_own on notifications
  for update to authenticated
  using (recipient_profile_id = auth.uid())
  with check (recipient_profile_id = auth.uid());

-- ===========================================================================
-- reports
-- ===========================================================================
create policy reports_select on reports
  for select to authenticated
  using (
    reporter_profile_id = auth.uid()
    or app.is_platform_admin()
    or (memorial_id is not null and app.has_memorial_permission(memorial_id, 'admins.manage'))
  );

create policy reports_insert_public on reports
  for insert to anon, authenticated
  with check (
    status = 'open'
    and resolved_by is null
    and resolved_at is null
    and (reporter_profile_id is null or reporter_profile_id = auth.uid())
  );

create policy reports_update_admin on reports
  for update to authenticated
  using (app.is_platform_admin())
  with check (app.is_platform_admin());

-- ===========================================================================
-- audit_logs   (read-only; append happens via service_role / SECURITY DEFINER)
-- ===========================================================================
create policy audit_logs_select on audit_logs
  for select to authenticated
  using (
    app.is_platform_admin()
    or (memorial_id is not null and app.has_memorial_permission(memorial_id, 'admins.manage'))
  );
