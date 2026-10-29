-- Evermora — development seed data
-- ===========================================================================
-- FICTIONAL DATA ONLY. No real person, family, or private information.
-- Runs against the LOCAL database on `supabase db reset`. Never against
-- staging or production (guarded in package.json / CI; see docs).
-- ===========================================================================

begin;

-- --- Auth users (local only) ----------------------------------------------
-- Password for every seeded account: "evermora-dev" (local Inbucket, no email).
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
  ('a0000000-0000-4000-a000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'ada.owner@example.test', crypt('evermora-dev', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Ada Okafor","full_name":"Adaeze Okafor"}'),
  ('a0000000-0000-4000-a000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'chidi.editor@example.test', crypt('evermora-dev', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Chidi Okafor"}'),
  ('a0000000-0000-4000-a000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'ngozi.mod@example.test', crypt('evermora-dev', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Ngozi Eze"}'),
  ('a0000000-0000-4000-a000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'tunde.draft@example.test', crypt('evermora-dev', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Tunde Balogun"}'),
  ('a0000000-0000-4000-a000-0000000000ff','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'staff@evermora.test', crypt('evermora-dev', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Evermora Staff"}');

-- GoTrue scans these token columns into non-nullable Go strings; a plain
-- INSERT leaves them NULL and every login then fails with
-- "converting NULL to string is unsupported". Normalise to empty string.
update auth.users
set confirmation_token = '',
    recovery_token = '',
    email_change = '',
    email_change_token_new = '',
    email_change_token_current = '',
    phone_change = '',
    phone_change_token = '',
    reauthentication_token = ''
where instance_id = '00000000-0000-0000-0000-000000000000';

-- Identities (so email login works locally)
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text,
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users
where id in (
  'a0000000-0000-4000-a000-000000000001','a0000000-0000-4000-a000-000000000002',
  'a0000000-0000-4000-a000-000000000003','a0000000-0000-4000-a000-000000000004',
  'a0000000-0000-4000-a000-0000000000ff'
);

-- Profiles are auto-created by the on_auth_user_created trigger; enrich them.
update profiles set full_name = 'Adaeze Chinwe Okafor', locale='en', timezone='Africa/Lagos'
  where id = 'a0000000-0000-4000-a000-000000000001';
update profiles set full_name = 'Chidiebere Okafor', timezone='Africa/Lagos'
  where id = 'a0000000-0000-4000-a000-000000000002';
update profiles set full_name = 'Ngozi Amara Eze', timezone='Africa/Lagos'
  where id = 'a0000000-0000-4000-a000-000000000003';
update profiles set full_name = 'Babatunde Balogun', timezone='Africa/Lagos'
  where id = 'a0000000-0000-4000-a000-000000000004';
update profiles set full_name = 'Evermora Platform Staff', is_platform_admin = true
  where id = 'a0000000-0000-4000-a000-0000000000ff';

-- ===========================================================================
-- Memorial 1 — PUBLISHED, PUBLIC : "Josephine Adaeze Okafor"
-- ===========================================================================
insert into memorials (id, status, funeral_planning_status, created_by, full_name,
                       preferred_name, headline, survived_by, gender, biography_summary,
                       date_of_birth, date_of_death, birth_place, resting_place, published_at)
values (
  'e1000000-0000-4000-a000-000000000001', 'published', 'confirmed',
  'a0000000-0000-4000-a000-000000000001', 'Josephine Adaeze Okafor',
  'Mama Josephine', 'Teacher, matriarch, and lover of hymns.',
  'Her husband Michael, five children, and eleven grandchildren.', 'female',
  'Josephine spent forty years teaching primary school in Enugu and raised five children.',
  '1945-03-12', '2026-07-28', 'Enugu, Nigeria', 'Enugu Municipal Cemetery',
  '2026-08-02 09:00:00+01'
);

-- Creator (Ada) is already OWNER via trigger. Add the other roles.
insert into memorial_memberships (memorial_id, profile_id, role, status, accepted_at, invited_by)
values
  ('e1000000-0000-4000-a000-000000000001','a0000000-0000-4000-a000-000000000002','content_editor','active', now(),'a0000000-0000-4000-a000-000000000001'),
  ('e1000000-0000-4000-a000-000000000001','a0000000-0000-4000-a000-000000000003','tribute_moderator','active', now(),'a0000000-0000-4000-a000-000000000001');

-- Pending invitations (no account yet, and one for an existing user).
insert into memorial_memberships (memorial_id, invited_email, role, status, invited_by)
values
  ('e1000000-0000-4000-a000-000000000001','new.helper@example.test','viewer','invited','a0000000-0000-4000-a000-000000000001'),
  ('e1000000-0000-4000-a000-000000000001','tunde.draft@example.test','content_editor','invited','a0000000-0000-4000-a000-000000000001');

-- Public visibility + a few sections public; family details stay members-only.
update privacy_settings set
  visibility = 'public',
  search_indexing_enabled = false,
  story_visibility = 'public',
  funeral_events_visibility = 'public',
  photos_visibility = 'public',
  updates_visibility = 'public'
where memorial_id = 'e1000000-0000-4000-a000-000000000001';

update feature_settings set
  photo_contributions_enabled = true,
  family_section_enabled = true
where memorial_id = 'e1000000-0000-4000-a000-000000000001';

-- Slugs: canonical + one historical alias
insert into memorial_slugs (memorial_id, slug, is_canonical, created_by)
values ('e1000000-0000-4000-a000-000000000001','josephine-okafor', true, 'a0000000-0000-4000-a000-000000000001');
insert into memorial_slugs (memorial_id, slug, is_canonical, redirect_enabled, created_by, retired_at)
values ('e1000000-0000-4000-a000-000000000001','mama-josephine', false, true, 'a0000000-0000-4000-a000-000000000001', now());

-- Permanent share / QR resolvers (one active, one retired from a superseded print run)
insert into share_resolvers (memorial_id, token, label, medium, created_by, is_active, retired_at)
values
  ('e1000000-0000-4000-a000-000000000001','a1b2c3d4e5f6', 'Funeral programme QR', 'funeral_programme','a0000000-0000-4000-a000-000000000001', true, null),
  ('e1000000-0000-4000-a000-000000000001','999888777666', 'Old memorial card (v1)', 'memorial_card','a0000000-0000-4000-a000-000000000001', false, now());

-- Media (metadata only; no bytes uploaded in seed)
insert into media (id, memorial_id, storage_bucket, storage_path, kind, mime_type,
                   byte_size, width, height, caption, source, visibility, processing_status, uploaded_by)
values
  ('d1000000-0000-4000-a000-000000000001','e1000000-0000-4000-a000-000000000001',
   'memorial-private','e1000000-0000-4000-a000-000000000001/gallery/portrait.jpg','image','image/jpeg',
   482113, 1200, 1500, 'Josephine in 2019', 'family', 'inherit', 'ready','a0000000-0000-4000-a000-000000000001'),
  ('d1000000-0000-4000-a000-000000000002','e1000000-0000-4000-a000-000000000001',
   'memorial-private','e1000000-0000-4000-a000-000000000001/gallery/harvest-1988.jpg','image','image/jpeg',
   331902, 1600, 1067, 'Harvest thanksgiving, 1988', 'family', 'inherit', 'ready','a0000000-0000-4000-a000-000000000002');

-- Album. Left as `draft` (and no memorial portrait set) because the seed uploads
-- no actual bytes — a published album would render broken <img> on the public
-- page. The family portal still lists these rows for local UI work.
insert into albums (id, memorial_id, title, description, status, visibility, display_order)
values ('c1000000-0000-4000-a000-000000000001','e1000000-0000-4000-a000-000000000001',
        'Family & Church', 'Gatherings across the decades.',
        'draft','public', 0);
update media set album_id = 'c1000000-0000-4000-a000-000000000001'
  where id = 'd1000000-0000-4000-a000-000000000002';

-- Story sections
insert into story_sections (memorial_id, kind, title, body, status, visibility, display_order)
values
  ('e1000000-0000-4000-a000-000000000001','biography','Her life',
   'Born in Enugu in 1945, Josephine trained as a teacher at St. Monica''s and taught for four decades...',
   'published','public',0),
  ('e1000000-0000-4000-a000-000000000001','faith','Faith and music',
   'She led the church choir for twenty years and knew every verse of the old hymnal by heart.',
   'published','public',1),
  ('e1000000-0000-4000-a000-000000000001','legacy','Legacy',
   'Draft notes from the family about scholarships in her name.',
   'draft','inherit',2);

-- Milestones (timeline)
insert into milestones (memorial_id, year, on_date, title, description, status, visibility, display_order)
values
  ('e1000000-0000-4000-a000-000000000001', 1945, '1945-03-12', 'Born in Enugu', null, 'published', 'inherit', 0),
  ('e1000000-0000-4000-a000-000000000001', 1966, null, 'Qualified as a teacher', 'St. Monica''s Teacher Training College.', 'published', 'inherit', 1),
  ('e1000000-0000-4000-a000-000000000001', 1971, '1971-11-20', 'Married Michael Okafor', null, 'published', 'inherit', 2),
  ('e1000000-0000-4000-a000-000000000001', 2010, null, 'Retired after 40 years teaching', null, 'published', 'inherit', 3),
  ('e1000000-0000-4000-a000-000000000001', 2026, '2026-07-28', 'Passed away in Enugu', null, 'draft', 'inherit', 4);

-- Related people (family details — members only by default)
insert into memorial_people (memorial_id, full_name, relationship, is_deceased, display_order)
values
  ('e1000000-0000-4000-a000-000000000001','Michael Okafor','Husband', true, 0),
  ('e1000000-0000-4000-a000-000000000001','Adaeze Okafor','Daughter', false, 1);

-- Funeral events
insert into funeral_events (memorial_id, event_type, status, title, description, event_date,
                            start_time, end_time, timezone, venue_name, address_line, city, region, country,
                            visibility, display_order, published_at)
values
  ('e1000000-0000-4000-a000-000000000001','service_of_songs','published','Service of Songs',
   'An evening of hymns and tributes.', '2026-08-14','17:00','19:00','Africa/Lagos',
   'St. Monica''s Church Hall','12 Cemetery Road','Enugu','Enugu','Nigeria','public',0,'2026-08-03 10:00+01'),
  ('e1000000-0000-4000-a000-000000000001','funeral_service','published','Funeral Service',
   'Requiem mass followed by interment.', '2026-08-15','10:00','12:30','Africa/Lagos',
   'St. Monica''s Catholic Church','1 Church Street','Enugu','Enugu','Nigeria','public',1,'2026-08-03 10:00+01'),
  ('e1000000-0000-4000-a000-000000000001','reception','draft','Reception',
   'Details being finalised.', '2026-08-15','13:00',null,'Africa/Lagos',
   'Family compound',null,'Enugu','Enugu','Nigeria','inherit',2,null),
  ('e1000000-0000-4000-a000-000000000001','wake','published','Family Wake-Keeping',
   'Close family only.', '2026-08-13','20:00',null,'Africa/Lagos',
   'Okafor family home',null,'Enugu','Enugu','Nigeria','members',3,'2026-08-03 10:00+01');

-- The funeral service has an exact venue pin (set from a pasted Google Maps
-- link); the service of songs doesn't, so the public page shows both shapes.
update funeral_events set latitude = 6.440200, longitude = 7.494300
where memorial_id = 'e1000000-0000-4000-a000-000000000001' and title = 'Funeral Service';

-- RSVP contacts overlap across events (one number formatted two ways); the
-- public page lists them once, under all the events.
update funeral_events set contacts =
  '[{"name":"Chidi Okafor","phone":"0803 123 4567"},{"name":"Ngozi Eze","phone":"0807 765 4321"}]'::jsonb
where memorial_id = 'e1000000-0000-4000-a000-000000000001' and title = 'Service of Songs';
update funeral_events set contacts =
  '[{"name":"Chidi Okafor","phone":"08031234567"},{"name":"Emeka Okafor","phone":null}]'::jsonb
where memorial_id = 'e1000000-0000-4000-a000-000000000001' and title = 'Funeral Service';

-- Family updates
insert into family_updates (memorial_id, title, body, importance, author_profile_id, status, visibility, published_at)
values
  ('e1000000-0000-4000-a000-000000000001','Thank you from the family',
   'We are grateful for the outpouring of love. Livestream details for the service will be posted here.',
   'high','a0000000-0000-4000-a000-000000000001','published','public','2026-08-05 08:00+01'),
  ('e1000000-0000-4000-a000-000000000001','Family logistics for the wake',
   'Close family only: gather at the house from 6pm; overnight arrangements as discussed.',
   'normal','a0000000-0000-4000-a000-000000000001','published','members','2026-08-06 09:00+01'),
  ('e1000000-0000-4000-a000-000000000001','Draft: order of service',
   'Still being finalised with the church.',
   'normal','a0000000-0000-4000-a000-000000000002','draft','inherit',null);

-- Tributes: one approved (newest), one pending, one rejected, plus five more
-- approved at staggered past timestamps — six approved in total, one past
-- the inline preview's limit of five, so "View all tributes" has something
-- real to link to and the e2e suite can assert on it deterministically.
insert into tributes (memorial_id, status, author_display_name, author_relationship, author_email, message,
                      moderated_by, moderated_at, published_at)
values
  ('e1000000-0000-4000-a000-000000000001','approved','Grace Nnamdi','Former pupil','grace.n@example.test',
   'Mrs. Okafor taught me to read. I became a teacher because of her.',
   'a0000000-0000-4000-a000-000000000003', now(), now()),
  ('e1000000-0000-4000-a000-000000000001','pending','Anonymous Neighbour','Neighbour', null,
   'She always had a kind word and a plate of food for anyone who passed.', null, null, null),
  ('e1000000-0000-4000-a000-000000000001','rejected','spam bot','', 'spam@example.test',
   'BUY CHEAP WATCHES', 'a0000000-0000-4000-a000-000000000003', now(), null),
  ('e1000000-0000-4000-a000-000000000001','approved','Chidi Eze','Nephew', null,
   'Aunty Josephine always had time for us, no matter how busy she was.',
   'a0000000-0000-4000-a000-000000000003', now() - interval '1 day', now() - interval '1 day'),
  ('e1000000-0000-4000-a000-000000000001','approved','Bola Adeyemi','Former colleague', null,
   'A dedicated teacher and a dear friend for over thirty years.',
   'a0000000-0000-4000-a000-000000000003', now() - interval '2 days', now() - interval '2 days'),
  ('e1000000-0000-4000-a000-000000000001','approved','Ngozi Umeh','Church member', null,
   'She led our choir with such grace and patience.',
   'a0000000-0000-4000-a000-000000000003', now() - interval '3 days', now() - interval '3 days'),
  ('e1000000-0000-4000-a000-000000000001','approved','Tunde Bakare','Student', null,
   'I will never forget her patience with a slow learner like me.',
   'a0000000-0000-4000-a000-000000000003', now() - interval '4 days', now() - interval '4 days'),
  ('e1000000-0000-4000-a000-000000000001','approved','A Wellwisher From The Village','Family friend', null,
   'Her legacy lives on in all of us she touched.',
   'a0000000-0000-4000-a000-000000000003', now() - interval '5 days', now() - interval '5 days');

-- Remembrance actions
insert into remembrance_actions (memorial_id, action_type, visitor_display_name, visitor_session)
values
  ('e1000000-0000-4000-a000-000000000001','candle','Grace', 'sess-0001'),
  ('e1000000-0000-4000-a000-000000000001','candle','Emeka', 'sess-0002'),
  ('e1000000-0000-4000-a000-000000000001','flower','Ijeoma', 'sess-0003'),
  ('e1000000-0000-4000-a000-000000000001','prayer',null, 'sess-0004');

-- ===========================================================================
-- Memorial 2 — DRAFT, PRIVATE : "Emeka Daniel Balogun"
-- ===========================================================================
insert into memorials (id, status, created_by, full_name, headline, date_of_birth, date_of_death, birth_place)
values (
  'e2000000-0000-4000-a000-000000000002', 'draft',
  'a0000000-0000-4000-a000-000000000004', 'Emeka Daniel Balogun',
  'Engineer and mentor.', '1958-11-02', '2026-08-20', 'Ibadan, Nigeria'
);
-- privacy_settings default visibility = 'private' (left as-is)

insert into memorial_slugs (memorial_id, slug, is_canonical, created_by)
values ('e2000000-0000-4000-a000-000000000002','emeka-balogun', true, 'a0000000-0000-4000-a000-000000000004');

insert into story_sections (memorial_id, kind, title, body, status, visibility, display_order)
values ('e2000000-0000-4000-a000-000000000002','biography','Draft biography',
        'Family is still gathering details.', 'draft','inherit',0);

insert into funeral_events (memorial_id, event_type, status, title, event_date, timezone, city, country, visibility, display_order)
values ('e2000000-0000-4000-a000-000000000002','funeral_service','draft','Funeral Service (planning)',
        null,'Africa/Lagos','Ibadan','Nigeria','inherit',0);

-- ===========================================================================
-- Service request (pre-memorial enquiry)
-- ===========================================================================
insert into service_requests (requested_by, contact_name, contact_email, contact_phone,
                              service_type, details, status)
values ('a0000000-0000-4000-a000-000000000004','Babatunde Balogun','tunde.draft@example.test','+234-800-000-0000',
        'funeral_planning','We would like help coordinating the service of songs and printing.', 'new');

-- ===========================================================================
-- An open report for the platform-admin queue
-- ===========================================================================
insert into reports (memorial_id, reason, details, reporter_email, status)
values ('e1000000-0000-4000-a000-000000000001','inaccurate',
        'The birth year looks wrong — should be 1946.', 'concerned.reader@example.test', 'open');

-- ===========================================================================
-- A notification and an audit entry (illustrative)
-- ===========================================================================
insert into notifications (recipient_profile_id, memorial_id, event_type, channel, payload, read_at)
values
  ('a0000000-0000-4000-a000-000000000001','e1000000-0000-4000-a000-000000000001',
   'tribute_submitted','in_app', '{"tribute_author":"Anonymous Neighbour"}', null),
  ('a0000000-0000-4000-a000-000000000001','e1000000-0000-4000-a000-000000000001',
   'memorial_reported','in_app', '{"reason":"inaccurate"}', now()),
  ('a0000000-0000-4000-a000-000000000002','e1000000-0000-4000-a000-000000000001',
   'family_update_published','in_app', '{"title":"Funeral livestream details"}', null);

-- an email-channel row for the (separate) delivery worker — never shown in-app
insert into notifications (recipient_email, memorial_id, event_type, channel, payload)
values ('tunde.draft@example.test','e1000000-0000-4000-a000-000000000001',
        'admin_invited','email', '{"role":"content_editor"}');

insert into audit_logs (actor_profile_id, actor_kind, action, entity_type, entity_id, memorial_id, metadata)
values ('a0000000-0000-4000-a000-000000000001','user','memorial.published','memorial',
        'e1000000-0000-4000-a000-000000000001','e1000000-0000-4000-a000-000000000001','{}');

commit;
