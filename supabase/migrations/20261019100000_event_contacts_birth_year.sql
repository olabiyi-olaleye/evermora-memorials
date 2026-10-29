-- Evermora — event RSVP contacts + year-only date of birth
--
-- 1. funeral_events.contacts — up to five {name, phone} RSVP contacts per
--    event. A burial invitation routinely lists several family members to
--    call; the single contact_name / contact_phone pair couldn't hold them.
--    Stored inline (jsonb) rather than as a child table: the list is tiny,
--    always read and written whole with its event, and shares the event's
--    RLS — a separate table would need its own policies for no gain.
--    Existing single contacts are carried over. contact_name / contact_phone
--    are left in place (no longer written by the app) so a deploy that
--    briefly runs old code against the new schema still works; drop them in
--    a later migration.
--
-- 2. memorials.birth_year_only — families often know only the birth year
--    ("born 1947"). date_of_birth stays a real date (YYYY-01-01 when only the
--    year is known) so ordering checks and the lifespan keep working; this
--    flag tells every renderer to show the year alone, never "1 January".

alter table funeral_events
  add column contacts jsonb not null default '[]'::jsonb;

alter table funeral_events add constraint funeral_events_contacts_shape check (
  jsonb_typeof(contacts) = 'array' and jsonb_array_length(contacts) <= 5
);

comment on column funeral_events.contacts is 'RSVP / enquiry contacts shown on the event card: array (max 5) of {"name": text, "phone": text|null}. Supersedes contact_name / contact_phone.';
comment on column funeral_events.contact_name is 'DEPRECATED — superseded by contacts; no longer written. Drop in a later migration.';
comment on column funeral_events.contact_phone is 'DEPRECATED — superseded by contacts; no longer written. Drop in a later migration.';

update funeral_events
set contacts = jsonb_build_array(
  jsonb_build_object('name', coalesce(contact_name, contact_phone), 'phone', contact_phone)
)
where contact_name is not null or contact_phone is not null;

alter table memorials
  add column birth_year_only boolean not null default false;

alter table memorials add constraint memorials_birth_year_only_has_date check (
  not birth_year_only or date_of_birth is not null
);

comment on column memorials.birth_year_only is 'True when only the birth year is known: date_of_birth holds YYYY-01-01 and is displayed as the year alone.';
