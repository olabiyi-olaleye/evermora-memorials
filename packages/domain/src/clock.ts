/**
 * Injectable clock. Business operations that stamp a time (publish, retire a
 * slug, audit) take a `Clock` so tests are deterministic and do not depend on
 * `Date.now()` inside the operation.
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** Test helper: a clock frozen at a fixed instant (optionally advanceable). */
export function fixedClock(start: Date | string): Clock & { advance(ms: number): void } {
  let current = typeof start === "string" ? new Date(start) : new Date(start.getTime());
  return {
    now: () => new Date(current.getTime()),
    advance: (ms: number) => {
      current = new Date(current.getTime() + ms);
    },
  };
}
