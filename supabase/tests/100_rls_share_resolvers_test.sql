-- Evermora RLS tests — share resolvers: write permission, member-only reads,
-- public token resolution (Phase 5J)
begin;
select plan(10);

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

-- Fixtures (seed): e1 published + public.
--   a0..01 owner (memorial.edit), a0..02 content_editor (memorial.edit),
--   a0..03 tribute_moderator (NO memorial.edit), a0..04 stranger.
--   e1 resolvers: token 'a1b2c3d4e5f6' active, token '999888777666' retired.
--   e2 draft + private.

-- ---- write permission (memorial.edit) --------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000002');  -- content_editor
select lives_ok(
  $$ insert into share_resolvers (memorial_id, token, label, medium)
     values ('e1000000-0000-4000-a000-000000000001','abc123abc123','Editor card','memorial_card') $$,
  'content_editor CAN mint a share resolver');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000003');  -- tribute_moderator
select throws_ok(
  $$ insert into share_resolvers (memorial_id, token) values
     ('e1000000-0000-4000-a000-000000000001','def456def456') $$,
  '42501', null,
  'tribute_moderator CANNOT mint a share resolver');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000004');  -- stranger
select throws_ok(
  $$ insert into share_resolvers (memorial_id, token) values
     ('e1000000-0000-4000-a000-000000000001','aaa111aaa111') $$,
  '42501', null,
  'stranger CANNOT mint a share resolver');

-- ---- reads: members only -------------------------------------------
select pg_temp.login_as('a0000000-0000-4000-a000-000000000003');  -- active member
select ok(
  (select count(*)::int from share_resolvers
     where memorial_id = 'e1000000-0000-4000-a000-000000000001') >= 2,
  'a member CAN list the memorial''s share resolvers');

select pg_temp.login_as('a0000000-0000-4000-a000-000000000004');  -- stranger (non-member)
select is(
  (select count(*)::int from share_resolvers
     where memorial_id = 'e1000000-0000-4000-a000-000000000001'),
  0, 'a non-member CANNOT list share resolvers directly');

select pg_temp.logout();
select throws_ok(
  $$ select count(*) from share_resolvers $$,
  '42501', null,
  'anon has no direct privilege on share_resolvers');

-- ---- public token resolution (SECURITY DEFINER RPC) ---------------
select is(
  (select canonical_slug from resolve_share_token('a1b2c3d4e5f6')),
  'josephine-okafor', 'anon CAN resolve an active token to the canonical slug');
select is(
  (select is_active from resolve_share_token('a1b2c3d4e5f6')),
  true, 'the active token reports is_active = true');
select is(
  (select is_active from resolve_share_token('999888777666')),
  false, 'a retired token still resolves but reports is_active = false');
select ok(
  (select count(*)::int from resolve_share_token('nosuchtokenhere')) = 0,
  'an unknown token resolves to nothing');

select * from finish();
rollback;
