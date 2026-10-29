"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge, Button, FormField, Input, Textarea } from "@evermora/ui";
import { formatMemorialDate } from "@evermora/utils";
import type { MemorialGender } from "@evermora/types";
import { editTributeAction, getMyTributeAction, submitTributeAction } from "@/lib/actions";
import type { MyTribute, PublicTribute } from "@/lib/tributes";
import { useMyTribute } from "./use-my-tribute";

/** "How you knew them" — pronoun-aware when the family has set one. */
function relationshipLabel(gender: MemorialGender | null): string {
  const pronoun = gender === "male" ? "him" : gender === "female" ? "her" : "them";
  return `How you knew ${pronoun}`;
}

/** A tribute annotated for display: is it the viewer's own, and is it still awaiting moderation. */
type DisplayTribute = PublicTribute & { mine?: boolean; pendingReview?: boolean };

export function Tributes({
  memorialId,
  tributes,
  hasMore,
  slug,
  canSubmit,
  moderated,
  gender,
}: {
  memorialId: string;
  tributes: PublicTribute[];
  /** True when more approved tributes exist than are in `tributes`. */
  hasMore: boolean;
  slug: string;
  canSubmit: boolean;
  moderated: boolean;
  gender: MemorialGender | null;
}) {
  // A visitor's own tribute stays invisible in `tributes` (server-fetched,
  // approved-only) for as long as it's pending — so on its own this list
  // would tell them "be the first" right next to a note saying they already
  // left one. Fetching it by their edit token and splicing it in (flagged
  // "You", with a status note if still pending) fixes that without touching
  // what any other visitor sees.
  const { stored } = useMyTribute(memorialId);
  const [myTribute, setMyTribute] = useState<MyTribute | null>(null);

  useEffect(() => {
    // Nothing to fetch. A stale `myTribute` from a prior `stored` is
    // harmless — every read of it below is already gated on `stored` too.
    if (!stored) return;
    let cancelled = false;
    getMyTributeAction(stored.editToken).then((t) => {
      if (!cancelled) setMyTribute(t);
    });
    return () => {
      cancelled = true;
    };
  }, [stored]);

  const mineAlreadyListed = Boolean(stored && tributes.some((t) => t.id === stored.tributeId));
  const displayTributes: DisplayTribute[] =
    stored && myTribute && !mineAlreadyListed
      ? [
          {
            id: stored.tributeId,
            authorDisplayName: myTribute.authorDisplayName,
            authorRelationship: myTribute.authorRelationship,
            message: myTribute.message,
            createdAt: myTribute.createdAt,
            mine: true,
            pendingReview: myTribute.status !== "approved",
          },
          ...tributes.map((t) => ({ ...t, mine: t.id === stored.tributeId })),
        ]
      : tributes.map((t) => ({ ...t, mine: stored ? t.id === stored.tributeId : false }));

  return (
    <section className="mt-16 border-t border-accent/25 pt-10 sm:mt-20 sm:pt-14">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">
        Remembrance
      </p>
      <h2 className="mt-3 font-serif text-[clamp(1.5rem,1.2rem+1.1vw,2rem)] text-fg">Tributes</h2>

      {displayTributes.length > 0 ? (
        <ul className="mt-8 flex flex-col gap-8">
          {displayTributes.map((t) => (
            <li key={t.id} className="border-l-2 border-accent/40 pl-4">
              <p className="text-justify font-serif text-[1.0625rem] leading-[1.6] text-balance whitespace-pre-line text-fg-muted italic">
                {t.message}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-fg-subtle not-italic">
                <span>
                  — {t.authorDisplayName}
                  {t.authorRelationship ? `, ${t.authorRelationship}` : ""}
                  {formatMemorialDate(t.createdAt) ? ` · ${formatMemorialDate(t.createdAt)}` : ""}
                </span>
                {t.mine ? <Badge tone="brand">You</Badge> : null}
                {t.pendingReview ? (
                  <Badge tone="warn" withDot>
                    Awaiting review
                  </Badge>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-fg-subtle">
          {canSubmit ? "Be the first to leave a tribute." : "No tributes yet."}
        </p>
      )}

      {hasMore ? (
        <a
          href={`/${slug}/tributes`}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover"
        >
          View all tributes
        </a>
      ) : null}

      {canSubmit ? (
        <TributePanel
          memorialId={memorialId}
          moderated={moderated}
          gender={gender}
          anchorId="leave-a-tribute"
        />
      ) : null}
    </section>
  );
}

/**
 * The small state machine around "does this browser already have a tribute
 * here": a chooser (edit it / leave another) once one exists, the plain form
 * otherwise. Shared by the inline section above and the auto-open prompt
 * (`tribute-prompt.tsx`) — both read the same localStorage-backed state via
 * `useMyTribute` and stay in sync with each other through it.
 */
export function TributePanel({
  memorialId,
  moderated,
  gender,
  anchorId,
  onDone,
}: {
  memorialId: string;
  moderated: boolean;
  gender: MemorialGender | null;
  /** Only the persistent inline section should claim this id — the modal's
   *  copy of this same panel must not, or two elements would share one id. */
  anchorId?: string;
  onDone?: () => void;
}) {
  const { stored, editing, loadForEdit, markSubmitted } = useMyTribute(memorialId);
  const [choice, setChoice] = useState<"edit" | "new" | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  // A submission made just now, in this render, shouldn't retroactively
  // swap the form (mid-"thank you") for the chooser just because `stored`
  // (synced from localStorage) has since become truthy.
  const [submittedThisSession, setSubmittedThisSession] = useState(false);

  if (!submittedThisSession && stored && choice === null) {
    return (
      <div id={anchorId} className="mt-12 scroll-mt-24 border-t border-line pt-10">
        <p className="font-serif text-lg text-fg">You&rsquo;ve already left a tribute here.</p>
        <p className="mt-1 text-sm text-fg-subtle">
          You can update what you wrote, or leave a separate one.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            loading={loadingEdit}
            onClick={async () => {
              setLoadingEdit(true);
              await loadForEdit();
              setLoadingEdit(false);
              setChoice("edit");
            }}
          >
            Edit your tribute
          </Button>
          <Button type="button" variant="secondary" onClick={() => setChoice("new")}>
            Leave another
          </Button>
        </div>
      </div>
    );
  }

  if (choice === "edit") {
    if (!editing) {
      return (
        <div id={anchorId} className="mt-12 scroll-mt-24 border-t border-line pt-10">
          <p role="status" className="text-sm text-fg-subtle">
            We couldn&rsquo;t find that tribute to edit. It may have been removed.
          </p>
        </div>
      );
    }
    return (
      <TributeForm
        memorialId={memorialId}
        moderated={moderated}
        gender={gender}
        anchorId={anchorId}
        mode="edit"
        editToken={stored?.editToken}
        initialValues={editing}
        onSuccess={onDone}
      />
    );
  }

  return (
    <TributeForm
      memorialId={memorialId}
      moderated={moderated}
      gender={gender}
      anchorId={anchorId}
      mode="create"
      onSuccess={(result) => {
        if (result.tributeId && result.editToken) {
          markSubmitted({ tributeId: result.tributeId, editToken: result.editToken });
        }
        setSubmittedThisSession(true);
        onDone?.();
      }}
    />
  );
}

interface TributeFormValues {
  authorDisplayName: string;
  authorRelationship: string | null;
  message: string;
}

interface TributeFormSuccess {
  tributeId: string | null;
  editToken: string | null;
  status: "pending" | "approved" | "discarded";
}

export function TributeForm({
  memorialId,
  moderated,
  gender,
  anchorId,
  mode = "create",
  editToken,
  initialValues,
  onSuccess,
}: {
  memorialId: string;
  moderated: boolean;
  gender: MemorialGender | null;
  anchorId?: string;
  mode?: "create" | "edit";
  editToken?: string;
  initialValues?: TributeFormValues;
  onSuccess?: (result: TributeFormSuccess) => void;
}) {
  const [name, setName] = useState(initialValues?.authorDisplayName ?? "");
  const [relationship, setRelationship] = useState(initialValues?.authorRelationship ?? "");
  const [message, setMessage] = useState(initialValues?.message ?? "");
  const [website, setWebsite] = useState(""); // honeypot
  const [done, setDone] = useState<TributeFormSuccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <p
        role="status"
        className="mt-10 max-w-2xl rounded-lg border border-ok/40 bg-ok-soft px-4 py-3 text-sm text-fg"
      >
        {mode === "edit"
          ? done.status === "approved"
            ? "Thank you — your changes have been saved."
            : "Thank you — your changes have been sent to the family for another look."
          : done.status === "approved"
            ? "Thank you — your tribute has been added."
            : "Thank you — your tribute has been sent to the family and will appear once they’ve had a chance to read it."}
      </p>
    );
  }

  return (
    <form
      id={anchorId}
      className="mt-12 flex scroll-mt-24 flex-col gap-4 border-t border-line pt-10"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res =
            mode === "edit" && editToken
              ? await editTributeAction({
                  editToken,
                  authorDisplayName: name.trim(),
                  authorRelationship: relationship.trim() || undefined,
                  message: message.trim(),
                })
              : await submitTributeAction({
                  memorialId,
                  authorDisplayName: name.trim(),
                  authorRelationship: relationship.trim() || undefined,
                  message: message.trim(),
                  honeypot: website,
                });
          if (res.ok) {
            const result: TributeFormSuccess =
              "tributeId" in res.data
                ? res.data
                : { tributeId: null, editToken: editToken ?? null, status: res.data.status };
            setDone(result);
            onSuccess?.(result);
          } else {
            setError(res.error.message);
          }
        });
      }}
    >
      <p className="font-serif text-lg text-fg">
        {mode === "edit" ? "Edit your tribute" : "Leave a tribute"}
      </p>
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-bad/40 bg-bad-soft px-3 py-2 text-sm text-fg"
        >
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Your name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </FormField>
        <FormField label={`${relationshipLabel(gender)} (optional)`}>
          <Input
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            maxLength={120}
          />
        </FormField>
      </div>
      <FormField label="Your message" required>
        <Textarea
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={5000}
        />
      </FormField>
      {mode === "create" ? (
        <label className="hidden" aria-hidden="true">
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending} disabled={!name.trim() || !message.trim()}>
          {mode === "edit" ? "Save changes" : "Post tribute"}
        </Button>
        {moderated ? (
          <span className="text-xs text-fg-subtle">
            The family reviews tributes before they appear.
          </span>
        ) : null}
      </div>
    </form>
  );
}
