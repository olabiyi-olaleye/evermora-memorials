# Database testing (pgTAP)

Dedicated RLS / security tests that exercise **real policies** as different
database roles — never just "a policy exists".

- Location: [`supabase/tests/`](../../supabase/tests) — `*_test.sql`.
- Runner: `supabase test db` (pgTAP via the `pg_prove` image). Root script
  `npm run db:test`.
- CI: the `database` job runs it on every push/PR
  ([ci-cd-architecture.md](./ci-cd-architecture.md)).
- Current: **41 assertions across 3 files**, all green.

## How a test switches role

```sql
-- helper defined per file in pg_temp
create function pg_temp.login_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
end $$;
```

`pg_temp.logout()` sets `role = anon`. `app.*` helpers read
`request.jwt.claims`, so the policies behave exactly as they would for a
PostgREST request from that role.

Fixtures come from the standard dev seed (`supabase/seed.sql`), which
`supabase db reset` loads — memorial `e1…` (published, public) and `e2…`
(draft, private), users `a0…01` owner / `a0…02` content_editor / `a0…03`
tribute_moderator / `a0…04` unrelated / `a0…ff` platform admin.

## Files & coverage

| File                                    | Focus                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `010_rls_memorial_visibility_test.sql`  | anon vs published/draft; published-only story sections; family details hidden from anon; unpublished funeral events hidden; anon has **no** privilege on `tributes` base table; `public_tributes` view readable; private-memorial slugs hidden; aggregate remembrance counts readable; unrelated user can read public content but not edit; owner can read family details + edit                                                                                                            |
| `020_rls_authorization_roles_test.sql`  | `app.has_memorial_permission` matrix per role; content_editor **cannot** approve a tribute but **can** edit a story; tribute_moderator **can** approve but **cannot** edit a story; owner has `memorial.delete` / `billing.manage`; content_editor **cannot** create an owner membership (42501); the last active owner **cannot** be removed (42501)                                                                                                                                       |
| `030_rls_visitors_and_privacy_test.sql` | anon can submit a `pending` tribute; anon **cannot** self-approve (42501); anon **cannot** submit to a private memorial (42501); anon can leave a remembrance / file a report / submit a service request; anon has **no** privilege to read `reports`; a non-staff user cannot read `service_requests` / another memorial's `audit_logs`; owner **can** read their memorial's audit trail; a status change writes an `audit_logs` row via trigger; platform admin can read service requests |

## Required scenarios (architecture spec §16 + Phase 2 brief §13) — mapping

| Scenario                                                   | Where                                                                                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| owner can edit their memorial                              | 010                                                                                                                          |
| unrelated authenticated user cannot edit                   | 010                                                                                                                          |
| content editor cannot transfer ownership / delete          | 020                                                                                                                          |
| tribute moderator moderates only; cannot edit stories      | 020                                                                                                                          |
| visitor reads only publicly-permitted published data       | 010                                                                                                                          |
| visitor cannot retrieve private memorial data              | 010                                                                                                                          |
| drafts are not publicly readable                           | 010                                                                                                                          |
| private family info not publicly readable                  | 010                                                                                                                          |
| anonymous tribute cannot self-approve                      | 030                                                                                                                          |
| last owner cannot be accidentally removed                  | 020                                                                                                                          |
| audit logs are protected                                   | 030                                                                                                                          |
| platform-admin path is explicit, not a broad client policy | 020 / 030                                                                                                                    |
| storage authorization mirrors memorial authorization       | policy design ([storage-architecture.md](./storage-architecture.md)); storage-object pgTAP assertions are a planned addition |

## Adding a test

1. `supabase db reset` (fresh schema + seed).
2. New `NNN_<area>_test.sql` in `supabase/tests/`: `select plan(N);` … `select * from finish();` inside `begin; … rollback;`.
3. Use `pg_temp.login_as()` / `throws_ok(sql, '42501')` / `lives_ok` / `is` / `ok`.
4. `supabase test db` → green, then commit.
