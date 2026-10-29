import type { Config } from "drizzle-kit";

/**
 * Drizzle is configured for INTROSPECTION and typed queries ONLY.
 *
 * The authoritative schema history is the SQL under `supabase/migrations/`,
 * applied with the Supabase CLI. Drizzle never authors migrations for this
 * project — do NOT run `drizzle-kit generate` or `drizzle-kit migrate`.
 *
 * Regenerate the typed schema from the live dev database after a migration:
 *   npm --workspace @evermora/database run db:pull
 * (see package.json — it points drizzle-kit at the local Supabase database)
 */
export default {
  dialect: "postgresql",
  out: "./src/drizzle",
  schemaFilter: ["public"],
  introspect: {
    casing: "camel",
  },
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
} satisfies Config;
