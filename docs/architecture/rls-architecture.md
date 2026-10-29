# Row Level Security architecture

RLS is a **primary** security layer, designed and tested alongside the schema —
not bolted on later. Every table in `public` has RLS `enable`d.

Migrations:
`…_rls_enable.sql` (enable + Data-API grants), `…_rls_policies_core.sql`
(identity / memorial / membership / slugs / share resolvers),
`…_rls_policies_content.sql` (content, tributes, funeral, updates, remembrance,
settings, service, notifications, reports, audit), `…_storage.sql` (buckets +
`storage.objects`).

## Grants

New `public` tables are **not** auto-exposed to the Data API roles (Supabase
default since 2026-05-30), so grants are explicit:

- **anon** — `select` on public content tables; `insert` on `tributes`,
  `remembrance_actions`, `reports`, `service_requests`. No access to `tributes` /
  `remembrance_actions` **rows** — those come via SECURITY DEFINER views.
- **authenticated** — `select/insert/update/delete` on the family-facing tables;
  `select`+`update` only on `notifications`; `select` only on `audit_logs`.
- **service_role** — bypasses RLS by design (server-only key).

## Read model

| Scope                                                        | Rule                                                                                                                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Memorial (any table)                                         | `app.can_read_memorial(m)` — members & platform admins always; otherwise `status = 'published'` **and** `visibility ∈ {public, anyone_with_link}`     |
| Section (people, story, funeral, photos, updates, documents) | additionally `app.can_read_memorial_section(m, section)` — the section's `privacy_settings` toggle must resolve to `public`/`inherit` for non-members |
| Draft / archived / suspended memorials                       | members & platform admins only                                                                                                                        |
| `tributes` base table                                        | members & platform admins only; everyone else → `public_tributes` view (approved rows, **no** `author_email`)                                         |
| `remembrance_actions` base table                             | members only; public → `remembrance_action_counts` aggregate view                                                                                     |
| `service_requests` base table                                | platform staff + assignee; requester → `my_service_requests` view (no `internal_notes`)                                                               |
| `audit_logs`                                                 | platform admins, and members with `admins.manage` for that memorial                                                                                   |

`anyone_with_link` behaves like `public` for direct reads — the slug **is** the
capability. Search-engine indexing is a separate flag, off by default
([privacy-architecture.md](./privacy-architecture.md)).

## Write model

Writes are gated by `app.has_memorial_permission(m, '<permission>')`:

| Table(s)                                                | Permission                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| `memorials` (edit)                                      | `memorial.edit` (delete: `memorial.delete`)                        |
| `memorial_people`, `memorial_slugs`, `feature_settings` | `memorial.edit`                                                    |
| `story_sections`                                        | `story.edit`                                                       |
| `albums`, `media`                                       | `gallery.manage`                                                   |
| `funeral_events`                                        | `funeral.manage`                                                   |
| `family_updates`                                        | `updates.publish`                                                  |
| `tributes`, `remembrance_actions` (moderation)          | `tributes.moderate`                                                |
| `memorial_memberships`                                  | `admins.manage` (owner role excluded — transfer is a dedicated op) |
| `privacy_settings`                                      | `privacy.manage`                                                   |
| `share_resolvers`                                       | `memorial.edit`                                                    |

Anonymous inserts (`tributes`, `remembrance_actions`, `reports`,
`service_requests`) use `WITH CHECK` to constrain the row to a clean initial
state (e.g. tribute must be `pending`, unmoderated, and the memorial must have
`tributes_enabled`).

## Integrity guards (triggers, `…_guards.sql`)

RLS decides _who_ writes; these decide _what the row may become_:

- `is_platform_admin` change → platform admins only.
- Memorial creator → auto `owner` membership.
- Memorial soft/hard delete → `memorial.delete` or platform admin.
- `status = 'suspended'` transitions → platform admin only.
- Last active `owner` cannot be removed/demoted without a transfer.
- A member may accept their own invite but not change their own role.

Guards short-circuit for non-end-users (`app.caller_is_end_user()` is false for
`service_role`, migrations and seed) — the domain layer owns checks there.

## Testing

pgTAP suites in [`supabase/tests/`](../../supabase/tests), run with
`supabase test db` (also in CI). They exercise **real policies** as anon /
unrelated user / owner / admin / content_editor / tribute_moderator / platform
admin against the standard dev seed. Current: **41 assertions across 3 files**.

Covered scenarios (architecture spec §16 + Phase 2 brief §13):

1. Owner can read/modify their memorial per permissions.
2. Unrelated authenticated user cannot modify another memorial.
3. Content editor cannot moderate tributes or delete/transfer.
4. Tribute moderator can moderate only; cannot edit story.
5. Visitor reads only publicly-permitted published data.
6. Visitor cannot retrieve private memorial data (rows or slugs).
7. Draft memorials are not publicly readable.
8. Private family info (people, private sections) not publicly readable.
9. Platform admin path is explicit, not a broad unsafe client policy.
10. Storage authorization mirrors memorial authorization
    ([storage-architecture.md](./storage-architecture.md)).

> The service-role key is **never** used as a shortcut around RLS. It is for
> trusted server code that has already done its own authorization.

## User-originated writes still go through RLS (Phase 5A)

Domain operations that mutate on behalf of a signed-in user run through
`@evermora/database`'s `UnitOfWork`, which opens one transaction on the direct
connection and immediately sets `SET LOCAL role = authenticated` (or `anon`) +
`request.jwt.claims` from the `CallerContext`. Every statement in that
transaction is therefore RLS-checked exactly as a PostgREST request would be —
the direct connection is a transport, not an authorization bypass. The only
escalation is a per-statement `SET LOCAL role = service_role` for the
`audit_logs` insert, inside the same atomic transaction. See
[../domain/repositories.md](../domain/repositories.md) (incl. the RLS +
`RETURNING` caveat) and [supabase-environment.md](./supabase-environment.md).
