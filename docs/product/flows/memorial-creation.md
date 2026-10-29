# Flow — Memorial creation

**Actor** a family member (becomes the memorial's `owner`).
**Goal** a published memorial at `evermora.com/{slug}` in one sitting.

## Preconditions

- The person has, or creates, an Evermora account (Supabase Auth →
  `profiles` row via trigger).

## Steps

| #   | Screen                                                   | Action                                                                                           | System                                                                                                                                                                                                                                                                                                                                  |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `apps/web` marketing / a shared "create a memorial" link | tap **Create a memorial**                                                                        | redirect to `family.evermora.com/sign-up` (or `/sign-in`)                                                                                                                                                                                                                                                                               |
| 2   | Sign up                                                  | email + password (+ display name)                                                                | Supabase Auth creates the user; `handle_new_user` trigger creates `profiles`; redirect to `/memorials/new`                                                                                                                                                                                                                              |
| 3   | Wizard · **Who**                                         | full name, preferred name, DOB, DOD, birthplace                                                  | client + server validate `date_of_death ≥ date_of_birth`; **Save & exit** persists a draft at any point                                                                                                                                                                                                                                 |
| 4   | Wizard · **Address**                                     | accept the prefilled slug or edit it                                                             | live check via `slug_is_available` — grammar (3–63, `a-z0-9-`, no edge/double hyphen, not pure-numeric), not reserved, not taken; suggests alternatives on collision                                                                                                                                                                    |
| 5   | Wizard · **Portrait**                                    | upload one photo (optional)                                                                      | signed upload to `memorial-public/{memorial_id}/portraits/…`; `media` row `processing_status='pending'`                                                                                                                                                                                                                                 |
| 6   | Wizard · **Message**                                     | short memorial message / headline                                                                | length-bounded, sanitised                                                                                                                                                                                                                                                                                                               |
| 7   | Wizard · **Visibility**                                  | Private (default) / Anyone with link / Public; **separate** search-indexing toggle (default off) | a plain-language summary sentence updates live                                                                                                                                                                                                                                                                                          |
| 8   | Wizard · **Review** → **Create**                         | confirm                                                                                          | **`createMemorial`**: inserts `memorials` (`status='draft'`, `created_by`), triggers create the **owner** membership + `feature_settings` + `privacy_settings`, inserts the first canonical `memorial_slugs` row; audit `memorial.created`; domain event `memorial.created`                                                             |
| 9   | Memorial overview                                        | see the completion checklist                                                                     | reads status + counts; shows what's left before publishing                                                                                                                                                                                                                                                                              |
| 10  | Story / Gallery / People (optional, any order)           | add a story section, upload photos, add related people                                           | `story_sections` / `media` / `memorial_people` writes; each `revalidate`s its section                                                                                                                                                                                                                                                   |
| 11  | Overview or Preview                                      | **Preview**                                                                                      | renders the public memorial in-portal (members may read drafts); device-frame toggle                                                                                                                                                                                                                                                    |
| 12  | Overview / Preview                                       | **Publish**                                                                                      | **`publishMemorial`**: checks the minimum-content bar (name + portrait **or** a published story — **funeral events not required**), sets `status='published'` + `published_at`; trigger writes `memorial.status_changed`, op writes `memorial.published`; domain event `memorial.published`; transport `revalidateTag('memorial:{id}')` |
| 13  | Overview                                                 | **View public memorial**                                                                         | opens `evermora.com/{slug}` — now live                                                                                                                                                                                                                                                                                                  |
| 14  | Sharing                                                  | copy link / generate a QR                                                                        | see [sharing-qr.md](./sharing-qr.md)                                                                                                                                                                                                                                                                                                    |

## Events

`MEMORIAL_STARTED` (step 3 committed) · `MEMORIAL_PUBLISHED` (step 12) ·
audit `memorial.created`, `memorial.status_changed`, `memorial.published`.

## Edge cases

- **Abandoned wizard** — a draft memorial persists; the user resumes from the
  dashboard. (A never-completed step-1 leaves nothing.)
- **Slug taken** — inline error + suggestions; the user can't proceed with a
  taken/reserved slug (DB trigger would reject it anyway).
- **Portrait upload fails** — retryable; publishing is still possible with a
  published story instead of a portrait.
- **Publish with missing content** — `precondition_failed` naming exactly what's
  missing; the memorial stays a draft.
- **Publish while suspended** — not possible (platform state); a banner
  explains.
- **Two family members creating the same memorial** — two separate memorials;
  they later consolidate by inviting each other / transferring ownership (no
  automatic merge).

## Principles touched

Family-controlled (nothing public without step 12) · privacy-conscious (private
default, indexing separate) · funeral info doesn't block publication (step 12) ·
mobile-first (one wizard step per screen).
