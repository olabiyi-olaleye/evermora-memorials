/**
 * Per-browser, per-memorial memory of a visitor's own tribute — localStorage
 * only, never sent to the server, never tied to a name/email/device
 * fingerprint. This is what lets the tribute prompt skip a visitor who's
 * already taken part, and what lets "edit your tribute" find the right one
 * without an account: the value it stores IS the private edit token.
 *
 * Framework-agnostic on purpose (no React) — `use-my-tribute.ts` is the hook
 * that wraps this for components.
 */

const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // re-offer a skipped prompt after a few days
/** Fired on `window` after a submit/edit succeeds, so every mounted instance
 *  (the modal, the inline section) can pick up the change without a reload. */
export const TRIBUTE_UPDATED_EVENT = "evermora:tribute-updated";

export interface StoredTribute {
  tributeId: string;
  editToken: string;
}

interface StoredSkip {
  skippedAt: number;
}

type StoredValue = StoredTribute | StoredSkip;

function key(memorialId: string): string {
  return `evermora.tribute.${memorialId}`;
}

function isStoredTribute(v: StoredValue): v is StoredTribute {
  return "editToken" in v;
}

function read(memorialId: string): StoredValue | null {
  try {
    const raw = window.localStorage.getItem(key(memorialId));
    return raw ? (JSON.parse(raw) as StoredValue) : null;
  } catch {
    return null;
  }
}

function write(memorialId: string, value: StoredValue): void {
  try {
    window.localStorage.setItem(key(memorialId), JSON.stringify(value));
  } catch {
    // Private browsing, quota, storage disabled — the prompt just won't
    // remember. Nothing else depends on this succeeding.
  }
}

function notify(memorialId: string): void {
  try {
    window.dispatchEvent(new CustomEvent(TRIBUTE_UPDATED_EVENT, { detail: { memorialId } }));
  } catch {
    // ignore
  }
}

/** The visitor's own tribute on this browser, if they've left one. */
export function getStoredTribute(memorialId: string): StoredTribute | null {
  const v = read(memorialId);
  return v && isStoredTribute(v) ? v : null;
}

export function saveTributeSubmitted(memorialId: string, tribute: StoredTribute): void {
  write(memorialId, tribute);
  notify(memorialId);
}

export function saveTributeSkipped(memorialId: string): void {
  write(memorialId, { skippedAt: Date.now() });
  notify(memorialId);
}

/** Should the prompt auto-open on this load? False once submitted; false for
 *  a cooldown after a skip; true otherwise (including on a fresh browser). */
export function shouldPromptForTribute(memorialId: string): boolean {
  const v = read(memorialId);
  if (!v) return true;
  if (isStoredTribute(v)) return false;
  return Date.now() - v.skippedAt > COOLDOWN_MS;
}
