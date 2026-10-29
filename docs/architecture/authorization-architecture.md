# Authorization architecture

Authentication answers _who is this?_ Authorization answers _what may they do?_
Evermora never treats a Supabase session as authorization.

```
auth.users  →  profiles  →  memorial_memberships  →  memorials
```

## Three layers

```
UI permissions            (hide what you can't do)          — convenience
        ↓
Domain / application       (@evermora/domain)               — the real decision
        ↓
Supabase Row Level Security                                 — the final boundary
```

Every layer is independent. The database layer must be correct on its own — an
attacker with a valid anon/authenticated key and direct PostgREST access still
cannot exceed what RLS allows.

## Roles (`memorial_role`)

| Role                | Intent                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| `owner`             | Full control incl. billing and deletion; exactly one active owner per memorial |
| `admin`             | Everything except billing and deletion                                         |
| `content_editor`    | Story, gallery, funeral, updates                                               |
| `tribute_moderator` | Tribute moderation only                                                        |
| `viewer`            | Read-only member (e.g. wider family)                                           |

Membership also has a `status` (`invited` → `active` → `suspended`/`revoked`);
only `active` memberships grant anything.

## Permission model

Role names are vocabulary. The authoritative mapping is the SQL function
**`app.has_memorial_permission(memorial_id, permission)`**:

| permission          | owner | admin | content_editor | tribute_moderator | viewer |
| ------------------- | :---: | :---: | :------------: | :---------------: | :----: |
| `memorial.edit`     |  done   |  done   |       done       |         —         |   —    |
| `story.edit`        |  done   |  done   |       done       |         —         |   —    |
| `gallery.manage`    |  done   |  done   |       done       |         —         |   —    |
| `funeral.manage`    |  done   |  done   |       done       |         —         |   —    |
| `updates.publish`   |  done   |  done   |       done       |         —         |   —    |
| `tributes.moderate` |  done   |  done   |       —        |        done         |   —    |
| `admins.manage`     |  done   |  done   |       —        |         —         |   —    |
| `privacy.manage`    |  done   |  done   |       —        |         —         |   —    |
| `billing.manage`    |  done   |   —   |       —        |         —         |   —    |
| `memorial.delete`   |  done   |   —   |       —        |         —         |   —    |

The domain layer (`@evermora/domain`) should check the **same permission strings**
before performing an operation, so UI, domain and RLS stay aligned.

## Platform administration

`profiles.is_platform_admin` gates the internal admin surface and a small set of
platform-wide RLS clauses (`app.is_platform_admin()`). It is **deliberately not**
folded into `has_memorial_permission` — platform authority is a separate, explicit
path, never an implicit superset of family permissions. The flag itself is
trigger-guarded: only an existing platform admin (or `service_role`) can set it.

## Helper functions (schema `app`, all SECURITY DEFINER, pinned `search_path`)

| Function                                    | Returns                                         |
| ------------------------------------------- | ----------------------------------------------- |
| `app.current_profile_id()`                  | `auth.uid()`                                    |
| `app.is_platform_admin()`                   | caller is active platform staff                 |
| `app.memorial_role(m)`                      | caller's active role on `m`, or NULL            |
| `app.is_memorial_member(m)`                 | caller has any active membership on `m`         |
| `app.has_memorial_permission(m, perm)`      | role→permission matrix above                    |
| `app.can_read_memorial(m)`                  | publication + visibility + membership           |
| `app.can_read_memorial_section(m, section)` | the above + per-section privacy                 |
| `app.caller_is_end_user()`                  | there is a JWT `sub` (used by integrity guards) |

They are SECURITY DEFINER so RLS policies can consult membership/profile rows
without the policy on those tables recursing.

## Session isolation (MVP, locked)

No shared `.evermora.com` auth cookie. `family.evermora.com` and
`admin.evermora.com` hold separate sessions; `evermora.com` is anonymous. See
architecture spec §14. Local Supabase auth `site_url` points at the family portal
(`:3001`).
