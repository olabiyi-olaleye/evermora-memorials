"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { getMyTributeAction } from "@/lib/actions";
import {
  getStoredTribute,
  saveTributeSkipped,
  saveTributeSubmitted,
  shouldPromptForTribute,
  TRIBUTE_UPDATED_EVENT,
  type StoredTribute,
} from "@/lib/tribute-storage";
import type { MyTribute } from "@/lib/tributes";

/**
 * The bridge between localStorage (`tribute-storage.ts`) and React — used by
 * both the inline Tributes section and the auto-open prompt, kept in sync
 * across both mounted instances via `useSyncExternalStore` (there's no
 * shared component tree between them to lift plain state into). Its server
 * snapshot is "nothing stored yet", exactly matching what a first paint with
 * no client JS has run should show — no hydration mismatch, and the real
 * value from this browser appears the moment React can read it.
 */

interface Snapshot {
  stored: StoredTribute | null;
  shouldPrompt: boolean;
}

const SERVER_SNAPSHOT: Snapshot = { stored: null, shouldPrompt: false };
const snapshotCache = new Map<string, Snapshot>();

function readSnapshot(memorialId: string): Snapshot {
  const stored = getStoredTribute(memorialId);
  const shouldPrompt = shouldPromptForTribute(memorialId);
  const prev = snapshotCache.get(memorialId);
  // useSyncExternalStore requires a stable reference when nothing changed.
  if (
    prev &&
    prev.shouldPrompt === shouldPrompt &&
    prev.stored?.tributeId === stored?.tributeId &&
    prev.stored?.editToken === stored?.editToken
  ) {
    return prev;
  }
  const next: Snapshot = { stored, shouldPrompt };
  snapshotCache.set(memorialId, next);
  return next;
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(TRIBUTE_UPDATED_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange); // another tab changed it
  return () => {
    window.removeEventListener(TRIBUTE_UPDATED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function useMyTribute(memorialId: string) {
  const { stored, shouldPrompt } = useSyncExternalStore(
    subscribe,
    () => readSnapshot(memorialId),
    () => SERVER_SNAPSHOT,
  );
  const [editing, setEditing] = useState<MyTribute | null>(null);

  const loadForEdit = useCallback(async (): Promise<MyTribute | null> => {
    const current = getStoredTribute(memorialId);
    if (!current) return null;
    const tribute = await getMyTributeAction(current.editToken);
    setEditing(tribute);
    return tribute;
  }, [memorialId]);

  const markSubmitted = useCallback(
    (tribute: StoredTribute) => saveTributeSubmitted(memorialId, tribute),
    [memorialId],
  );
  const markSkipped = useCallback(() => saveTributeSkipped(memorialId), [memorialId]);

  return { stored, shouldPrompt, editing, loadForEdit, markSubmitted, markSkipped };
}
