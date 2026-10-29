/**
 * Helpers for handling the Postgres connection string safely.
 *
 * The DATABASE_URL contains the database password. Never log it raw.
 */

/** Replace the password component of a Postgres URL with `***`. */
export function redactConnectionString(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    // Not a parseable URL - assume the whole thing is sensitive.
    return "***";
  }
}

/** True when the URL points at a local database (dev only). */
export function isLocalConnection(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}
