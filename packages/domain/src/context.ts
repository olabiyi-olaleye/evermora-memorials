import type { MemorialId, MemorialRole, ProfileId } from "@evermora/types";

/**
 * The authenticated caller and their capabilities, as resolved by the
 * transport layer BEFORE a domain operation runs. The domain trusts this
 * object's identity claims but still enforces every authorization rule itself.
 */
export interface CallerContext {
  /** Supabase `auth.users` id, or null for an anonymous visitor. */
  readonly userId: ProfileId | null;
  /** True for Evermora platform staff (platform-admin surface). */
  readonly isPlatformAdmin: boolean;
  /** Roles the caller holds per memorial, keyed by memorial id. */
  readonly memorialRoles: ReadonlyMap<MemorialId, MemorialRole>;
  /** Best-effort request metadata for audit records. */
  readonly request?: {
    readonly ip?: string;
    readonly userAgent?: string;
  };
}

export const anonymousContext = (): CallerContext => ({
  userId: null,
  isPlatformAdmin: false,
  memorialRoles: new Map(),
});

export function isAuthenticated(
  context: CallerContext,
): context is CallerContext & { userId: ProfileId } {
  return context.userId !== null;
}

export function roleForMemorial(
  context: CallerContext,
  memorialId: MemorialId,
): MemorialRole | null {
  return context.memorialRoles.get(memorialId) ?? null;
}
