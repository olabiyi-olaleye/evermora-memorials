# Generated database types

`../src/supabase/database.types.ts` is generated from the live schema:

```
npm run db:types        # supabase gen types typescript --local
```

It is committed so type checking works without a database connection, and
regenerated whenever a migration changes the schema. It is the row-shape
authority — **not** the domain model (database row ≠ domain model ≠ UI model).
