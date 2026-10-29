# Migrations moved

The authoritative SQL migration history now lives at the repository root:

```
supabase/migrations/
```

This is the Supabase CLI's standard location, so `supabase db reset`,
`supabase db diff` and `supabase db push` work without extra configuration.
Drizzle still never authors migrations.

Workflow and rationale: [`docs/architecture/supabase-environment.md`](../../../docs/architecture/supabase-environment.md).
