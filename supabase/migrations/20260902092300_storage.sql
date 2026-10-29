-- Evermora — Phase 2 data foundation
-- 0024 · Storage buckets + storage.objects RLS  (§19)
--
-- Path convention (immutable ids, never names):
--   {bucket}/{memorial_id}/{purpose}/{file}
--
-- Buckets:
--   memorial-public   public  — published portraits / gallery
--   memorial-private  private — unpublished / members-only media
--   tribute-uploads   private — visitor-submitted tribute media (pre-moderation)
--   documents         private — programmes, orders of service, certificates
--   service-assets    private — platform/service operations only

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('memorial-public',  'memorial-public',  true,  26214400,
     array['image/jpeg','image/png','image/webp','image/avif','image/gif']),
  ('memorial-private', 'memorial-private', false, 26214400,
     array['image/jpeg','image/png','image/webp','image/avif','image/gif','video/mp4','audio/mpeg','audio/mp4']),
  ('tribute-uploads',  'tribute-uploads',  false, 10485760,
     array['image/jpeg','image/png','image/webp','image/avif']),
  ('documents',        'documents',        false, 15728640,
     array['application/pdf','image/jpeg','image/png','image/webp']),
  ('service-assets',   'service-assets',   false, 52428800, null)
on conflict (id) do nothing;

-- Safe "first path segment -> memorial uuid" helper (NULL on any malformed name).
create or replace function app.storage_memorial_id(object_name text)
returns uuid
language plpgsql
immutable
as $$
begin
  return ((storage.foldername(object_name))[1])::uuid;
exception when others then
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- memorial-public
-- ---------------------------------------------------------------------------
create policy "memorial-public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'memorial-public');

create policy "memorial-public write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'memorial-public'
    and app.has_memorial_permission(app.storage_memorial_id(name), 'gallery.manage')
  );

create policy "memorial-public modify" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'memorial-public'
    and app.has_memorial_permission(app.storage_memorial_id(name), 'gallery.manage')
  );

create policy "memorial-public delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'memorial-public'
    and app.has_memorial_permission(app.storage_memorial_id(name), 'gallery.manage')
  );

-- ---------------------------------------------------------------------------
-- memorial-private
-- ---------------------------------------------------------------------------
create policy "memorial-private read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'memorial-private'
    and (
      app.is_memorial_member(app.storage_memorial_id(name))
      or app.can_read_memorial_section(app.storage_memorial_id(name), 'photos')
    )
  );

create policy "memorial-private write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'memorial-private'
    and app.has_memorial_permission(app.storage_memorial_id(name), 'gallery.manage')
  );

create policy "memorial-private modify" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'memorial-private'
    and app.has_memorial_permission(app.storage_memorial_id(name), 'gallery.manage')
  );

create policy "memorial-private delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'memorial-private'
    and app.has_memorial_permission(app.storage_memorial_id(name), 'gallery.manage')
  );

-- ---------------------------------------------------------------------------
-- tribute-uploads — visitors may upload; only members may read (moderation)
-- ---------------------------------------------------------------------------
create policy "tribute-uploads submit" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'tribute-uploads'
    and app.can_read_memorial(app.storage_memorial_id(name))
    and exists (
      select 1 from feature_settings fs
      where fs.memorial_id = app.storage_memorial_id(name)
        and fs.tributes_enabled and fs.photo_contributions_enabled
    )
  );

create policy "tribute-uploads read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'tribute-uploads'
    and (
      app.has_memorial_permission(app.storage_memorial_id(name), 'tributes.moderate')
      or app.has_memorial_permission(app.storage_memorial_id(name), 'gallery.manage')
    )
  );

create policy "tribute-uploads moderate" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'tribute-uploads'
    and (
      app.has_memorial_permission(app.storage_memorial_id(name), 'tributes.moderate')
      or app.has_memorial_permission(app.storage_memorial_id(name), 'gallery.manage')
    )
  );

-- ---------------------------------------------------------------------------
-- documents  (section: documents)
-- ---------------------------------------------------------------------------
create policy "documents read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (
      app.is_memorial_member(app.storage_memorial_id(name))
      or app.can_read_memorial_section(app.storage_memorial_id(name), 'documents')
    )
  );

create policy "documents write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (
      app.has_memorial_permission(app.storage_memorial_id(name), 'gallery.manage')
      or app.has_memorial_permission(app.storage_memorial_id(name), 'funeral.manage')
    )
  );

create policy "documents modify" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and (
      app.has_memorial_permission(app.storage_memorial_id(name), 'gallery.manage')
      or app.has_memorial_permission(app.storage_memorial_id(name), 'funeral.manage')
    )
  );

create policy "documents delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (
      app.has_memorial_permission(app.storage_memorial_id(name), 'gallery.manage')
      or app.has_memorial_permission(app.storage_memorial_id(name), 'funeral.manage')
    )
  );

-- ---------------------------------------------------------------------------
-- service-assets — platform operations only
-- ---------------------------------------------------------------------------
create policy "service-assets admin" on storage.objects
  for all to authenticated
  using (bucket_id = 'service-assets' and app.is_platform_admin())
  with check (bucket_id = 'service-assets' and app.is_platform_admin());
