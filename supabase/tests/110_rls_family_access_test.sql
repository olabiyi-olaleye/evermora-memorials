-- Evermora RLS tests — family access: membership writes, owner guards, invite
-- accept + ownership transfer RPCs (Phase 5K)
begin;
select plan(13);

create or replace function pg_temp.login_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
end $$;
create or replace function pg_temp.login_email(uid uuid, mail text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated', 'email', mail)::text, true);
end $$;

-- Capture the pending-invite ids as superuser (RLS hides them from non-members).
create temp table t_invites as
  select id, invited_email::text as email
  from memorial_memberships
  where memorial_id = 'e1000000-0000-4000-a000-000000000001' and status = 'invited';
grant select on t_invites to authenticated;

-- ---- membership writes need admins.manage --------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');  -- owner
select lives_ok(
  $$ insert into memorial_memberships (memorial_id, invited_email, role, status, invited_by)
     values ('e1000000-0000-4000-a000-000000000001','fresh@example.test','viewer','invited',
             'a0000000-0000-4000-a000-000000000001') $$,
  'owner CAN create an invite');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');  -- content_editor (no admins.manage)
select throws_ok(
  $$ insert into memorial_memberships (memorial_id, invited_email, role, status)
     values ('e1000000-0000-4000-a000-000000000001','x@example.test','viewer','invited') $$,
  '42501', null,
  'content_editor CANNOT create an invite');

select throws_ok(
  $$ insert into memorial_memberships (memorial_id, invited_email, role, status)
     values ('e1000000-0000-4000-a000-000000000001','x@example.test','owner','invited') $$,
  '42501', null,
  'nobody can insert an owner membership directly');

-- ---- self-role guard ---------------------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000003');  -- tribute_moderator
select throws_ok(
  $$ update memorial_memberships set role = 'admin'
     where memorial_id = 'e1000000-0000-4000-a000-000000000001'
       and profile_id = 'a0000000-0000-4000-a000-000000000003' $$,
  '42501', null,
  'a member CANNOT change their own role');

-- ---- last-owner guard ------------------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');  -- owner
select throws_ok(
  $$ update memorial_memberships set status = 'revoked'
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and role = 'owner' $$,
  '42501', null,
  'the last active owner cannot be revoked');
select throws_ok(
  $$ delete from memorial_memberships
     where memorial_id = 'e1000000-0000-4000-a000-000000000001' and role = 'owner' $$,
  '42501', null,
  'the last active owner cannot be deleted');

-- ---- ownership transfer RPC -----------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');  -- content_editor, not owner
select throws_ok(
  $$ select public.transfer_memorial_ownership(
       'e1000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000002') $$,
  '42501', null,
  'a non-owner CANNOT transfer ownership');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000001');  -- owner
select lives_ok(
  $$ select public.transfer_memorial_ownership(
       'e1000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000002') $$,
  'the owner CAN transfer ownership to an active member');
select is(
  (select count(*)::int from memorial_memberships
     where memorial_id = 'e1000000-0000-4000-a000-000000000001'
       and role = 'owner' and status = 'active'),
  1, 'still exactly one active owner after the transfer');
select is(
  (select role::text from memorial_memberships
     where memorial_id = 'e1000000-0000-4000-a000-000000000001'
       and profile_id = 'a0000000-0000-4000-a000-000000000001'),
  'admin', 'the previous owner is demoted to admin, not removed');

-- ---- accept_memorial_invite RPC ------------------------------
select pg_temp.login_email('a0000000-0000-4000-a000-000000000004', 'tunde.draft@example.test');
select lives_ok(
  format($f$ select * from accept_memorial_invite(%L) $f$,
    (select id from t_invites where email = 'tunde.draft@example.test')),
  'the invitee CAN accept their own invite (JWT email matches)');
select is(
  (select status::text from memorial_memberships
     where memorial_id = 'e1000000-0000-4000-a000-000000000001'
       and profile_id = 'a0000000-0000-4000-a000-000000000004'),
  'active', 'the accepted membership is active and linked to the profile');
select throws_ok(
  format($f$ select * from accept_memorial_invite(%L) $f$,
    (select id from t_invites where email = 'new.helper@example.test')),
  'P0002', null,
  'a user CANNOT accept an invite addressed to a different email');

select * from finish();
rollback;
