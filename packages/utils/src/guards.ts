/** Narrow away `null` and `undefined`. */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Exhaustiveness helper for discriminated unions / switch statements.
 * Reaching this at runtime means a case was missed.
 */
export function assertNever(value: never, message = "Unexpected value"): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}

/** Clamp a number to an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) throw new Error(`clamp: min (${min}) must be <= max (${max})`);
  return Math.min(Math.max(value, min), max);
}
