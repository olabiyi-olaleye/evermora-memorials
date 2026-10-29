-- Evermora — Phase 5E
-- milestones · dated life events shown as a timeline on the memorial.
--
-- Distinct from `story_sections` (prose): a milestone is a single dated point
-- (a year, optionally a full date) with a short title and optional note.
-- Same per-section privacy model as the story ('story' section toggle) and the
-- same `story.edit` write permission.

create table milestones (
  id            uuid primary key default extensions.gen_random_uuid(),
  memorial_id   uuid not null references memorials (id) on delete cascade,

  -- Either a bare year, or a full date. `year` is always set (derived from
  -- `on_date` when a full date is given) so the timeline can sort cheaply.
  year          int not null,
  on_date       date,

  title         text not null,
  description   text,

  visibility    section_visibility not null default 'inherit',
  status        publication_status not null default 'published',
  display_order int not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint milestones_title_len check (char_length(title) between 1 and 200),
  constraint milestones_description_len check (description is null or char_length(description) <= 1000),
  constraint milestones_year_range check (year between 1 and 9999),
  constraint milestones_year_matches_date check (on_date is null or extract(year from on_date)::int = year)
);

comment on table milestones is 'Dated life events for the memorial timeline. Privacy: the "story" section toggle. Write: story.edit.';

create index milestones_memorial_idx
  on milestones (memorial_id, year, display_order)
  where deleted_at is null;

create trigger milestones_set_updated_at
  before update on milestones
  for each row execute function app.set_updated_at();

alter table milestones enable row level security;

create policy milestones_select on milestones
  for select to anon, authenticated
  using (
    deleted_at is null
    and (
      app.is_memorial_member(memorial_id)
      or (status = 'published' and app.can_read_memorial_section(memorial_id, 'story'))
    )
  );

create policy milestones_write_editors on milestones
  for all to authenticated
  using (app.has_memorial_permission(memorial_id, 'story.edit'))
  with check (app.has_memorial_permission(memorial_id, 'story.edit'));

-- The Phase 2 grant-hardening revoked default privileges, so grant explicitly.
grant select on milestones to anon;
grant select, insert, update, delete on milestones to authenticated;
