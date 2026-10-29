-- Evermora — Phase 2 data foundation
-- 0006 · memorial_memberships
--
-- The authorization edge between a profile and a memorial (§9).

create table memorial_memberships (
  id            uuid primary key default extensions.gen_random_uuid(),
  memorial_id   uuid not null references memorials (id) on delete cascade,
  profile_id    uuid references profiles (id) on delete cascade,
  role          memorial_role not null,
  status        membership_status not null default 'invited',

  -- Invitation metadata (a membership may exist before the invitee has an account)
  invited_email citext,
  invited_by    uuid references profiles (id) on delete set null,
  invited_at    timestamptz not null default now(),
  accepted_at   timestamptz,
  revoked_at    timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint memorial_memberships_profile_or_email check (
    profile_id is not null or invited_email is not null
  )
);

comment on table memorial_memberships is
  'profile <-> memorial authorization edge. Role names are vocabulary; permission mapping lives in app.has_memorial_permission().';

-- One membership per (memorial, profile).
create unique index memorial_memberships_unique_profile
  on memorial_memberships (memorial_id, profile_id)
  where profile_id is not null;

-- One pending invite per (memorial, email).
create unique index memorial_memberships_unique_invite
  on memorial_memberships (memorial_id, lower(invited_email))
  where profile_id is null;

-- Exactly one active owner per memorial.
create unique index memorial_memberships_one_active_owner
  on memorial_memberships (memorial_id)
  where role = 'owner' and status = 'active';

create index memorial_memberships_profile_idx
  on memorial_memberships (profile_id) where status = 'active';
create index memorial_memberships_memorial_idx
  on memorial_memberships (memorial_id);

create trigger memorial_memberships_set_updated_at
  before update on memorial_memberships
  for each row execute function app.set_updated_at();
