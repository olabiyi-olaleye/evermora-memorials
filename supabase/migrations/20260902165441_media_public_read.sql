-- Evermora — Phase 5F
-- Let anonymous visitors read gallery objects in `memorial-private` when the
-- photos section is publicly visible, so the public memorial site can mint
-- short-lived signed URLs with only the anon key (no service-role in apps/web).
--
-- The gate is unchanged in spirit — `app.can_read_memorial_section(id,'photos')`
-- already returns false for a non-member on a members-only or private memorial.
-- We also require a matching, ready, non-deleted `media` row so a raw object
-- with no DB record is never signable.

drop policy "memorial-private read" on storage.objects;

create policy "memorial-private read" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'memorial-private'
    and (
      app.is_memorial_member(app.storage_memorial_id(name))
      or (
        app.can_read_memorial_section(app.storage_memorial_id(name), 'photos')
        and exists (
          select 1 from public.media m
          where m.storage_bucket = 'memorial-private'
            and m.storage_path = storage.objects.name
            and m.processing_status = 'ready'
            and m.deleted_at is null
        )
      )
    )
  );
