"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent } from "@evermora/ui";
import type { MemorialGender } from "@evermora/types";
import { TributePanel } from "./tributes";
import { useMyTribute } from "./use-my-tribute";

/**
 * The tribute prompt, opened automatically once per browser. `shouldPrompt`
 * (from `useMyTribute`) decides whether to open it, but only in the moment
 * it first becomes eligible — once that happens, `open` is this component's
 * own independent state, driven only by explicit user actions from then on.
 *
 * That distinction matters: `shouldPrompt` flips to `false` the instant a
 * submission succeeds (its whole job is deciding "does this browser still
 * need asking"), and if the dialog's `open` prop tracked it live, a
 * successful submit would slam the dialog shut on its own "thank you"
 * message before anyone could read it. Deriving `open` once, via the
 * render-time "adjust state when a value changes" pattern React itself
 * documents for this exact situation, avoids that without an effect.
 *
 * `justSubmitted` is the same idea applied to Skip: closing right after a
 * genuine submission must not be recorded as a Skip, which would overwrite
 * the edit-token state `TributePanel` just saved with a mere timestamp.
 */
export function TributePrompt({
  memorialId,
  personName,
  moderated,
  gender,
}: {
  memorialId: string;
  personName: string;
  moderated: boolean;
  gender: MemorialGender | null;
}) {
  const { shouldPrompt, markSkipped } = useMyTribute(memorialId);
  const [open, setOpen] = useState(false);
  const [prevShouldPrompt, setPrevShouldPrompt] = useState(shouldPrompt);
  const [justSubmitted, setJustSubmitted] = useState(false);

  if (shouldPrompt !== prevShouldPrompt) {
    setPrevShouldPrompt(shouldPrompt);
    if (shouldPrompt) setOpen(true);
  }

  function dismiss() {
    if (!justSubmitted) markSkipped();
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent
        title={`In loving memory of ${personName}`}
        description="Share a memory or a few words for the family."
        className="sm:w-[min(34rem,calc(100vw-2rem))]"
        footer={
          <Button type="button" variant="ghost" onClick={dismiss}>
            {justSubmitted ? "Done" : "Skip for now"}
          </Button>
        }
      >
        <TributePanel
          memorialId={memorialId}
          moderated={moderated}
          gender={gender}
          onDone={() => setJustSubmitted(true)}
        />
      </DialogContent>
    </Dialog>
  );
}
