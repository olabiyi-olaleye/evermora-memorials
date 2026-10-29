-- Evermora — Phase 2 data foundation
-- 0019 · audit_logs  (§21)
--
-- Append-only record of consequential actions. Written by the domain layer
-- (service_role) and by DB triggers for a few high-value events. No UPDATE or
-- DELETE is ever permitted (enforced by RLS + revoked grants).

create table audit_logs (
  id            bigint generated always as identity primary key,
  actor_profile_id uuid references profiles (id) on delete set null,
  actor_kind    audit_actor_kind not null default 'system',
  action        text not null,
  entity_type   text,
  entity_id     uuid,
  memorial_id   uuid references memorials (id) on delete set null,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  constraint audit_logs_action_len check (char_length(action) between 1 and 100)
);

comment on table audit_logs is 'Append-only. No UPDATE/DELETE. Avoid storing sensitive values in metadata.';

create index audit_logs_memorial_idx on audit_logs (memorial_id, created_at desc);
create index audit_logs_actor_idx on audit_logs (actor_profile_id, created_at desc);
create index audit_logs_action_idx on audit_logs (action, created_at desc);

-- Harden against accidental writes even from privileged roles.
revoke update, delete, truncate on audit_logs from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Trigger-side audit for a handful of events that must never be missed even if
-- the domain layer forgets: slug changes, ownership changes, memorial status.
-- ---------------------------------------------------------------------------
create or replace function app.audit_memorial_status_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.audit_logs (actor_profile_id, actor_kind, action, entity_type, entity_id, memorial_id, metadata)
    values (
      auth.uid(),
      case when auth.uid() is null then 'system' else 'user' end::audit_actor_kind,
      'memorial.status_changed',
      'memorial',
      new.id,
      new.id,
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger memorials_audit_status_change
  after update on memorials
  for each row execute function app.audit_memorial_status_change();

create or replace function app.audit_membership_owner_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if new.role = 'owner' and new.status = 'active'
     and (tg_op = 'INSERT' or old.role is distinct from 'owner' or old.status is distinct from 'active') then
    insert into public.audit_logs (actor_profile_id, actor_kind, action, entity_type, entity_id, memorial_id, metadata)
    values (
      auth.uid(),
      case when auth.uid() is null then 'system' else 'user' end::audit_actor_kind,
      'memorial.ownership_transferred',
      'memorial_membership',
      new.id,
      new.memorial_id,
      jsonb_build_object('new_owner_profile_id', new.profile_id)
    );
  end if;
  return new;
end;
$$;

create trigger memberships_audit_owner_change
  after insert or update on memorial_memberships
  for each row execute function app.audit_membership_owner_change();
