# Roles

Every actor in Evermora. Authorization detail is in
[permission-matrix.md](./permission-matrix.md); the technical model is
[../architecture/authorization-architecture.md](../architecture/authorization-architecture.md).

## Visitor (anonymous) — LOCKED

No account. Can:

- view a **published** memorial whose visibility is `public` or
  `anyone_with_link` (by URL);
- read approved tributes, published funeral events, published family updates,
  public story/gallery/people sections;
- **where the family enables it**: submit a tribute (goes to `pending`), leave a
  remembrance action, submit a photo with a tribute;
- report a memorial or a tribute;
- submit a service request;
- open a QR / share link.

Cannot: see drafts, private memorials, `members`-only sections, any private
column (submitter emails, internal notes), or anything in the portals.

## Signed-in user (no memorial role)

A `profiles` row exists. Same as a visitor, plus: create a memorial (becoming
its owner), accept a memorial invitation, manage their account, see their own
service requests and notifications.

## Family / memorial roles

Held per memorial via `memorial_memberships` (`role` + `status`; only `active`
grants anything).

| Role                  | Who it's for                                                  | Can                                                                                                                                         |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **owner**             | the person responsible for the memorial (exactly one, active) | everything: edit, publish, archive, delete, change slug, manage privacy & features, manage access, **transfer ownership**, billing (future) |
| **admin**             | a trusted co-manager                                          | everything an owner can **except** delete, transfer ownership, billing                                                                      |
| **content_editor**    | a relative helping with the story & photos                    | edit identity/story/gallery, manage funeral events, publish family updates; **no** moderation, access, privacy, or lifecycle control        |
| **tribute_moderator** | someone just handling the incoming messages                   | approve / reject / hide tributes and hide remembrance actions; nothing else                                                                 |
| **viewer**            | wider family who should see private sections but not edit     | read everything on that memorial (including `members`-only sections); no writes                                                             |

Membership `status`: `invited` → `active` (on accept) → `suspended` / `revoked`.

## Platform staff (`profiles.is_platform_admin`)

Evermora employees, on the isolated `admin.evermora.com` surface. Can:

- view users, memorials, memberships, reports, service requests, all audit logs;
- **suspend / unsuspend** a memorial (platform-only, guarded);
- hide tributes / remembrance actions on any memorial;
- triage and manage service requests (incl. `internal_notes`);
- investigate abuse and privacy reports.

**Platform authority is a separate, explicit path** — it is _not_ an implicit
superset of family permissions. Platform staff do not silently edit a family's
story or publish their memorial; they act through platform operations (suspend,
moderate, resolve a report), each audited with `actor_kind = platform_admin`.

The `is_platform_admin` flag is trigger-guarded — only an existing platform
admin (or `service_role`) can grant it.

## Non-actors (system)

- **Triggers / migrations / jobs** act as `actor_kind = system`.
- The **notification service** and background jobs (anniversary reminders, media
  processing — all FUTURE) run outside any user session.
