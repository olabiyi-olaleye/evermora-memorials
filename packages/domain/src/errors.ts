/**
 * Domain error taxonomy.
 *
 * Domain operations signal failure by throwing one of these. Transports
 * (Server Actions, Route Handlers) map them to their own concerns — an HTTP
 * status, a form error — but the domain never speaks HTTP itself.
 *
 * Callers distinguish failures by `code`; the more specific subclasses add a
 * machine-readable `details.reason` where a single code covers several cases
 * (e.g. slug validation). Never put a secret, credential, raw SQL, or Postgres
 * error text in `message` / `details`.
 */

export type DomainErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "precondition_failed"
  | "rate_limited"
  | "internal";

export interface DomainErrorOptions {
  code: DomainErrorCode;
  message: string;
  /** Safe-to-expose detail, e.g. field errors or a `reason`. Never secrets. */
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details?: Record<string, unknown>;

  constructor({ code, message, details, cause }: DomainErrorOptions) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

export class UnauthenticatedError extends DomainError {
  constructor(message = "Authentication is required.") {
    super({ code: "unauthenticated", message });
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "You do not have permission to perform this action.") {
    super({ code: "forbidden", message });
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "The requested resource was not found.") {
    super({ code: "not_found", message });
    this.name = "NotFoundError";
  }
}

export class ValidationError extends DomainError {
  constructor(message = "The input was invalid.", details?: Record<string, unknown>) {
    super({ code: "validation", message, details });
    this.name = "ValidationError";
  }
}

export class ConflictError extends DomainError {
  constructor(
    message = "The action conflicts with the current state.",
    details?: Record<string, unknown>,
  ) {
    super({ code: "conflict", message, details });
    this.name = "ConflictError";
  }
}

export class PreconditionFailedError extends DomainError {
  constructor(message = "A required condition is not met.", details?: Record<string, unknown>) {
    super({ code: "precondition_failed", message, details });
    this.name = "PreconditionFailedError";
  }
}

export class RateLimitedError extends DomainError {
  constructor(
    message = "You've done that a few times just now. Please wait a moment and try again.",
    details?: Record<string, unknown>,
  ) {
    super({ code: "rate_limited", message, details });
    this.name = "RateLimitedError";
  }
}

// --- Memorial-specific ------------------------------------------------------

export class MemorialNotFoundError extends NotFoundError {
  constructor(message = "That memorial does not exist or is not available to you.") {
    super(message);
    this.name = "MemorialNotFoundError";
  }
}

/** Wrong lifecycle state for the requested transition (e.g. archived → publish). */
export class MemorialInvalidStateError extends PreconditionFailedError {
  constructor(currentStatus: string, message?: string) {
    super(
      message ?? `The memorial cannot be changed from its current state ("${currentStatus}").`,
      {
        reason: "memorial_invalid_state",
        currentStatus,
      },
    );
    this.name = "MemorialInvalidStateError";
  }
}

/** The memorial is already published (publishMemorial is not idempotent). */
export class MemorialAlreadyPublishedError extends ConflictError {
  constructor(message = "This memorial is already published.") {
    super(message, { reason: "memorial_already_published" });
    this.name = "MemorialAlreadyPublishedError";
  }
}

// --- Slug-specific (all `code: "validation"` except SlugUnavailable) --------

export class SlugInvalidError extends ValidationError {
  constructor(candidate: string, message?: string) {
    super(message ?? `"${candidate}" is not a valid memorial address.`, {
      reason: "slug_invalid",
      candidate,
    });
    this.name = "SlugInvalidError";
  }
}

export class SlugReservedError extends ValidationError {
  constructor(candidate: string) {
    super(`"${candidate}" is a reserved address and cannot be used for a memorial.`, {
      reason: "slug_reserved",
      candidate,
    });
    this.name = "SlugReservedError";
  }
}

/** The slug is valid but already taken by another memorial (or lost a race). */
export class SlugUnavailableError extends ConflictError {
  constructor(candidate: string) {
    super(`The address "${candidate}" is already in use.`, {
      reason: "slug_unavailable",
      candidate,
    });
    this.name = "SlugUnavailableError";
  }
}

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof DomainError;
}
