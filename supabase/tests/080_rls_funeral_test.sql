-- Evermora RLS tests — funeral events: write permission, event-level visibility (Phase 5H)
begin;
select plan(12);

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

-- Fixtures (seed): e1 published + public, funeral_events_visibility = 'public'.
--   a0..01 owner (funeral.manage), a0..02 content_editor (funeral.manage),
--   a0..03 tribute_moderator (NO funeral.manage), a0..04 stranger.
--   e1 events: 2 published/public, 1 draft/inherit ("Reception"), 1 published/members ("Family Wake-Keeping").
--   e2 draft + private, 1 draft event.

-- ---- write permission (funeral.manage) --------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');  -- content_editor HAS funeral.manage
select lives_ok(
  $$ insert into funeral_events (memorial_id, event_type, title, status)
     values ('e1000000-0000-4000-a000-000000000001','custom','Added by editor','draft') $$,
  'content_editor CAN add a funeral event');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000003');  -- tribute_moderator lacks funeral.manage
select throws_ok(
  $$ insert into funeral_events (memorial_id, event_type, title)
     values ('e1000000-0000-4000-a000-000000000001','custom','Nope') $$,
  '42501', null,
  'tribute_moderator CANNOT add a funeral event');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000004');  -- stranger
select throws_ok(
  $$ insert into funeral_events (memorial_id, event_type, title)
     values ('e1000000-0000-4000-a000-000000000001','custom','Nope') $$,
  '42501', null,
  'stranger CANNOT add a funeral event');

-- ---- event-level visibility: anon (§39) -------------------------------
select pg_temp.logout();
select is(
  (select count(*)::int from funeral_events
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and status = 'published'
       and visibility in ('inherit','public')),
  2, 'anon CAN read published public/inherit funeral events');
select is(
  (select count(*)::int from funeral_events
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and status = 'draft'),
  0, 'anon CANNOT read draft funeral events');
select is(
  (select count(*)::int from funeral_events
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and visibility = 'members'),
  0, 'anon CANNOT read a members-only funeral event even when published (§39)');
select is(
  (select count(*)::int from funeral_events where memorial_id = 'e2000000-0000-4000-a000-000000000002'),
  0, 'anon CANNOT read funeral events of a private/draft memorial');

-- ---- members see everything -----------------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000003');  -- any active member
select ok(
  (select count(*)::int from funeral_events
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and deleted_at is null) >= 4,
  'an active member sees draft + members-only + public funeral events');

-- ---- stranger cannot edit an existing event -------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000004');  -- stranger
update funeral_events set title = 'hijacked'
  where memorial_id = 'e1000000-0000-4000-a000-000000000001' and event_type = 'service_of_songs';
select is(
  (select count(*)::int from funeral_events
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and title = 'hijacked'),
  0, 'stranger CANNOT edit a funeral event (write policy excludes the row)');

-- ---- publish check constraint --------------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');  -- owner
select throws_ok(
  $$ update funeral_events set status = 'published'
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and title = 'Added by editor' $$,
  '23514', null,
  'a funeral event cannot be published without published_at (check constraint)');
select lives_ok(
  $$ update funeral_events set status = 'published', published_at = now()
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and title = 'Reception' $$,
  'owner CAN publish a draft funeral event that has a date');

-- ---- funeral planning status is independent of memorial lifecycle ---
select lives_ok(
  $$ update memorials set funeral_planning_status = 'confirmed'
     where id = 'e1000000-0000-4000-a000-000000000001' $$,
  'owner CAN change funeral_planning_status on a published memorial');

select * from finish();
rollback;
