import "server-only";
import { createFamilyPortalEnv } from "@/env";

let cached: ReturnType<typeof createFamilyPortalEnv> | undefined;

/**
 * Server-only, validated environment. Lazily validated on first use (at request
 * time) so `next build` does not require the runtime secrets to be present.
 * Never import this from a client component.
 */
export function serverEnv(): ReturnType<typeof createFamilyPortalEnv> {
  cached ??= createFamilyPortalEnv();
  return cached;
}
