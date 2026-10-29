import type { CallerContext } from "@evermora/domain";
import { isDomainError } from "@evermora/domain";

/**
 * Pure helpers shared by the server auth/transport layer. Kept free of
 * `server-only` / `next/*` imports so they are unit-testable.
 */

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  isPlatformAdmin: boolean;
}

/**
 * Build the domain `CallerContext` from a **server-verified** session user.
 * Identity comes only from `user`; nothing here is derived from request input.
 * `memorialRoles` is left empty — operations resolve per-memorial roles in
 * their own transaction and RLS re-checks.
 */
export function toCallerContext(
  user: AuthUser,
  request?: { ip?: string; userAgent?: string },
): CallerContext {
  return {
    userId: user.id as CallerContext["userId"],
    isPlatformAdmin: user.isPlatformAdmin,
    memorialRoles: new Map(),
    request,
  };
}

/** Only a same-origin relative path is an acceptable post-auth redirect target. */
export function safeNext(next: string | null | undefined): string {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

export type ActionError = { code: string; message: string; details?: Record<string, unknown> };

/** Map any thrown value to a safe, serialisable error — never raw SQL / stack. */
export function toActionError(err: unknown): ActionError {
  if (isDomainError(err)) {
    return { code: err.code, message: err.message, details: err.details };
  }
  return { code: "internal", message: "Something went wrong. Please try again." };
}
