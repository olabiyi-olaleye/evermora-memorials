-- Evermora — Phase 2 data foundation
-- 0011 · tributes  (§16)
--
-- Visitor tributes require NO visitor account. Submitter email is private and
-- must never be exposed publicly. Moderation default is 'pending'.

create table tributes (
  id            uuid primary key default extensions.gen_random_uuid(),
  memorial_id   uuid not null references memorials (id) on delete cascade,
  status        tribute_status not null default 'pending',

  author_display_name text not null,
  author_relationship text,
  author_email        citext,        -- PRIVATE — never returned to anon reads
  message             text not null,
  media_id            uuid references media (id) on delete set null,

  -- lightweight anti-abuse context (not exposed publicly)
  submitted_ip        inet,
  submitted_user_agent text,

  moderated_by   uuid references profiles (id) on delete set null,
  moderated_at   timestamptz,
  moderation_note text,
  published_at   timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint tributes_author_name_len check (char_length(author_display_name) between 1 and 120),
  constraint tributes_message_len check (char_length(message) between 1 and 5000),
  constraint tributes_approved_has_timestamp check (status <> 'approved' or published_at is not null)
);

comment on column tributes.author_email is 'PRIVATE. Exposed only to memorial moderators/owners and platform admins via RLS.';

create index tributes_memorial_status_idx on tributes (memorial_id, status) where deleted_at is null;
create index tributes_pending_idx on tributes (memorial_id) where status = 'pending' and deleted_at is null;

create trigger tributes_set_updated_at
  before update on tributes
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Public-safe projection: approved tributes WITHOUT any private column.
-- apps/web (anon key) reads this view, never the base table. It is
-- SECURITY DEFINER on purpose — the hardcoded WHERE is the entire contract,
-- and anon is deliberately granted no privilege on the `tributes` base table.
-- ---------------------------------------------------------------------------
create view public_tributes
with (security_invoker = false)
as
  select
    t.id,
    t.memorial_id,
    t.author_display_name,
    t.author_relationship,
    t.message,
    t.media_id,
    t.published_at,
    t.created_at
  from tributes t
  join memorials m on m.id = t.memorial_id
  where t.status = 'approved'
    and t.deleted_at is null
    and m.status = 'published'
    and m.deleted_at is null;

comment on view public_tributes is
  'Approved tributes, private columns removed. SECURITY DEFINER: the WHERE clause is the contract.';

grant select on public_tributes to anon, authenticated;
