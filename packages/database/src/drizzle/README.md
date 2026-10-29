# `src/drizzle`

| File                               | Committed            | Purpose                                              |
| ---------------------------------- | -------------------- | ---------------------------------------------------- |
| `client.ts`                        | yes                  | `createDrizzleClient()` — server-only typed SQL / tx |
| `schema.ts`,`relations.ts`         | **no** (git-ignored) | `drizzle-kit pull` introspection output              |
| `meta/`                            | no                   | drizzle-kit introspection bookkeeping                |
| `../scripts/fix-introspection.mjs` | yes                  | post-processes pull output (maps `citext`)           |

## Schema authority

The single source of truth for the schema is **`supabase/migrations/`**, applied
with the Supabase CLI. Drizzle **never** authors migrations — no
`drizzle-kit generate`, no `drizzle-kit migrate`.

## Typed queries today

`createDrizzleClient()` returns a schema-less Drizzle instance. Use tagged-SQL
execution and `db.transaction(...)`; type result rows with the Supabase-generated
`Database` type exported from `@evermora/database`.

## Regenerating a full relational schema (optional)

```bash
supabase db reset
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54422/postgres \
  npm --workspace @evermora/database run db:pull
```

drizzle-kit 0.31 introspection needs manual cleanup for our cyclic media↔memorial
foreign keys and expression defaults, so the generated `schema.ts` is kept local
(git-ignored) rather than wired into the typecheck gate. Revisit when drizzle-kit
introspection handles those cases.
