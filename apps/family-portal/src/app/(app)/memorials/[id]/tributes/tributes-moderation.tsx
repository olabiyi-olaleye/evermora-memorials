"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { formatMemorialDate } from "@evermora/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  Button,
  SectionHeader,
  StatCard,
  StatusBadge,
} from "@evermora/ui";
import { FormError } from "@/components/form";
import type { FamilyTribute } from "@/lib/data/tributes";
import {
  approveTributeAction,
  hideTributeAction,
  rejectTributeAction,
} from "@/lib/actions/tributes";

type Result = { ok: boolean; error?: { message: string } };

export function TributesModeration({
  memorialId,
  pending,
  approved,
  other,
}: {
  memorialId: string;
  pending: FamilyTribute[];
  approved: FamilyTribute[];
  other: FamilyTribute[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  function act(fn: () => Promise<Result>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setError(res.error?.message ?? "Something went wrong.");
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <FormError message={error} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Awaiting review"
          value={pending.length}
          tone={pending.length > 0 ? "attention" : "default"}
        />
        <StatCard label="On the memorial" value={approved.length} />
        <StatCard label="Rejected or hidden" value={other.length} />
      </div>

      <section className="flex flex-col gap-4">
        <SectionHeader
          title={`Awaiting review${pending.length ? ` (${pending.length})` : ""}`}
          description="Visitors' messages appear here first. Nothing is public until you approve it."
        />
        {pending.length === 0 ? (
          <Empty>Nothing is waiting for review.</Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {pending.map((t) => (
              <li key={t.id}>
                <TributeCard t={t} showEmail badge={<StatusBadge status="pending" />}>
                  <Button
                    size="sm"
                    loading={busy}
                    onClick={() => act(() => approveTributeAction({ memorialId, tributeId: t.id }))}
                  >
                    Approve
                  </Button>
                  <ConfirmAction
                    label="Reject"
                    title="Reject this tribute?"
                    description="It won't be shown on the memorial. The person who wrote it isn't told."
                    confirmLabel="Reject"
                    disabled={busy}
                    onConfirm={() =>
                      act(() => rejectTributeAction({ memorialId, tributeId: t.id }))
                    }
                  />
                </TributeCard>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeader title={`On the memorial${approved.length ? ` (${approved.length})` : ""}`} />
        {approved.length === 0 ? (
          <Empty>No tributes are showing on the memorial yet.</Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {approved.map((t) => (
              <li key={t.id}>
                <TributeCard t={t} badge={<StatusBadge status="approved" />}>
                  <ConfirmAction
                    label="Hide"
                    tone="brand"
                    title="Hide this tribute?"
                    description="It will be removed from the memorial. You can put it back later."
                    confirmLabel="Hide"
                    disabled={busy}
                    onConfirm={() => act(() => hideTributeAction({ memorialId, tributeId: t.id }))}
                  />
                </TributeCard>
              </li>
            ))}
          </ul>
        )}
      </section>

      {other.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionHeader title="Rejected & hidden" />
          <ul className="flex flex-col gap-4">
            {other.map((t) => (
              <li key={t.id}>
                <TributeCard t={t} muted badge={<StatusBadge status={t.status} />}>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busy}
                    onClick={() => act(() => approveTributeAction({ memorialId, tributeId: t.id }))}
                  >
                    Put back on the memorial
                  </Button>
                </TributeCard>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-subtle">
      {children}
    </p>
  );
}

function TributeCard({
  t,
  showEmail,
  muted,
  badge,
  children,
}: {
  t: FamilyTribute;
  showEmail?: boolean;
  muted?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const date = formatMemorialDate(t.createdAt);
  return (
    <article
      className={
        muted
          ? "rounded-lg border border-line bg-surface p-5"
          : "rounded-lg border border-line bg-raised p-5 shadow-e1"
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-fg">
          {t.authorDisplayName}
          {t.authorRelationship ? (
            <span className="font-normal text-fg-muted"> · {t.authorRelationship}</span>
          ) : null}
        </p>
        {badge}
      </div>
      <blockquote className="border-l-2 border-accent/40 pl-3.5 font-serif text-[0.975rem] leading-relaxed whitespace-pre-line text-fg-muted italic">
        {t.message}
      </blockquote>
      <p className="mt-3 flex flex-wrap gap-x-3 font-mono text-[11.5px] text-fg-subtle">
        {date ? <span>{date}</span> : null}
        {showEmail && t.authorEmail ? <span>{t.authorEmail}</span> : null}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    </article>
  );
}

function ConfirmAction({
  label,
  tone = "danger",
  title,
  description,
  confirmLabel,
  disabled,
  onConfirm,
}: {
  label: string;
  tone?: "danger" | "brand";
  title: string;
  description: string;
  confirmLabel: string;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="secondary" disabled={disabled}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        tone={tone}
        onConfirm={onConfirm}
      />
    </AlertDialog>
  );
}
