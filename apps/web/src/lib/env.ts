import "server-only";
import { createWebEnv } from "@/env";

let cached: ReturnType<typeof createWebEnv> | undefined;

/**
 * Server-only, validated environment. Lazily validated on first use (request
 * time) so `next build` does not require the values to be present.
 */
export function serverEnv(): ReturnType<typeof createWebEnv> {
  cached ??= createWebEnv();
  return cached;
}
