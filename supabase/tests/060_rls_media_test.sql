-- Evermora RLS tests — albums, media, and gallery storage objects (Phase 5F)
begin;
select plan(9);

create or replace function pg_temp.login_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
end $$;
create or replace function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
end $$;

-- Setup as the superuser (RLS bypassed): register two storage objects for real
-- seeded media paths — one on the public memorial e1, one on the private e2.
insert into storage.objects (bucket_id, name, owner)
values
  ('memorial-private','e1000000-0000-4000-a000-000000000001/gallery/harvest-1988.jpg',
   'a0000000-0000-4000-a000-000000000001'),
  ('memorial-private','e2000000-0000-4000-a000-000000000002/gallery/secret.jpg',
   'a0000000-0000-4000-a000-000000000004')
on conflict do nothing;

-- Fixtures (seed): e1 published + public, photos_visibility = 'public', two
-- ready media rows in memorial-private with paths e1.../gallery/*.jpg.
--   a0..01 owner, a0..02 content_editor (HAS gallery.manage), a0..03 tribute_moderator, a0..04 stranger

-- ---- media / album table writes need gallery.manage --------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');  -- content_editor
select lives_ok(
  $$ insert into albums (memorial_id, title, status) values
     ('e1000000-0000-4000-a000-000000000001','Editor album','draft') $$,
  'content_editor CAN create an album');
select lives_ok(
  $$ insert into media (memorial_id, storage_bucket, storage_path, kind, source, processing_status)
     values ('e1000000-0000-4000-a000-000000000001','memorial-private',
             'e1000000-0000-4000-a000-000000000001/gallery/new.jpg','image','family','ready') $$,
  'content_editor CAN record a media row');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000003');  -- tribute_moderator
select throws_ok(
  $$ insert into media (memorial_id, storage_bucket, storage_path, kind, source, processing_status)
     values ('e1000000-0000-4000-a000-000000000001','memorial-private',
             'e1000000-0000-4000-a000-000000000001/gallery/nope.jpg','image','family','ready') $$,
  '42501');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000004');  -- stranger
select throws_ok(
  $$ insert into albums (memorial_id, title) values
     ('e1000000-0000-4000-a000-000000000001','nope') $$,
  '42501');

-- ---- anon reads: ready media on a public memorial ---------------------
select pg_temp.logout();
select ok(
  (select count(*)::int from media
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and processing_status = 'ready') >= 1,
  'anon CAN read ready media of a public memorial (photos section public)');
select is(
  (select count(*)::int from media where memorial_id = 'e2000000-0000-4000-a000-000000000002'),
  0, 'anon CANNOT read media of a private/draft memorial');

-- ---- storage.objects: gallery object visibility mirrors the section ---
select is(
  (select count(*)::int from storage.objects
     where bucket_id = 'memorial-private'
       and name = 'e1000000-0000-4000-a000-000000000001/gallery/harvest-1988.jpg'),
  1, 'anon CAN see a public memorial''s gallery storage object (has a ready media row)');
select is(
  (select count(*)::int from storage.objects
     where bucket_id = 'memorial-private'
       and name = 'e2000000-0000-4000-a000-000000000002/gallery/secret.jpg'),
  0, 'anon CANNOT see a private memorial''s gallery storage object');

-- A member always sees their own private gallery object.
select pg_temp.login_as('a0000000-0000-4000-a000-000000000004');  -- owner of e2
select is(
  (select count(*)::int from storage.objects
     where bucket_id = 'memorial-private'
       and name = 'e2000000-0000-4000-a000-000000000002/gallery/secret.jpg'),
  1, 'a member CAN see their own memorial''s private gallery storage object');

select * from finish();
rollback;
