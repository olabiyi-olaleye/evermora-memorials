import type { MemorialId } from "@evermora/types";

/**
 * Injectable id generator. Operations that need an entity's id *before* the
 * insert (to reference it in the same transaction's audit / event / child
 * rows) take an `IdGenerator` so the id is deterministic in tests.
 *
 * The value is always a UUID string. The concrete UUID implementation
 * (`uuidIdGenerator`) lives in `@evermora/database` — id generation is an
 * infrastructure concern; the domain owns only the port and the test double.
 */
export interface IdGenerator {
  newId(): string;
}

/** Test helper: hands out a fixed, ordered list of ids, then throws. */
export function fixedIdGenerator(ids: readonly string[]): IdGenerator {
  let i = 0;
  return {
    newId: () => {
      const id = ids[i++];
      if (id === undefined) throw new Error("fixedIdGenerator exhausted");
      return id;
    },
  };
}

export const asMemorialId = (id: string): MemorialId => id as MemorialId;
