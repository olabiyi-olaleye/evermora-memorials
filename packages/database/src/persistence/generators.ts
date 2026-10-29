import { randomUUID } from "node:crypto";
import type { IdGenerator } from "@evermora/domain";

/**
 * Production id generator — UUID v4 via Node's crypto. The `Clock` production
 * implementation (`systemClock`) lives in `@evermora/domain` (it needs no
 * runtime API beyond `Date`).
 */
export const uuidIdGenerator: IdGenerator = {
  newId: () => randomUUID(),
};
