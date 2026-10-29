import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";
import { roleHasPermission } from "@evermora/domain";
import { cn, SectionHeader, StatCard } from "@evermora/ui";
import { getMemorialDetail } from "@/lib/data/memorials";
import { formatDate, VISIBILITY_LABEL } from "@/lib/format";
import { PublishButton } from "./publish-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const m = await getMemorialDetail(id);
  return { title: m ? `${m.profile.fullName} — Overview` : "Memorial" };
}

const FUNERAL_STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  planning: "Being planned",
  partially_confirmed: "Partly confirmed",
  confirmed: "Confirmed",
  completed: "Completed",
};

export default async function MemorialOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const memorial = await getMemorialDetail(id);
  if (!memorial) return null; // the layout already called notFound()

  const base = `/memorials/${memorial.id}`;
  const canEdit = roleHasPermission(memorial.role, "memorial.edit");
  const isDraft = memorial.status === "draft";
  const isPublished = memorial.status === "published";
  const isSuspended = memorial.status === "suspended";
  const tributesOn = memorial.features.tributesEnabled;

  // Real, actionable items only — never a fabricated to-do.
  const attention: { label: string; href: string }[] = [];
  if (tributesOn && memorial.pendingTributeCount > 0)
    attention.push({
      label: `${memorial.pendingTributeCount} tribute${memorial.pendingTributeCount === 1 ? "" : "s"} awaiting your review`,
      href: `${base}/tributes`,
    });
  if (!memorial.profile.dateOfBirth && !memorial.profile.dateOfDeath)
    attention.push({ label: "Add their dates", href: `${base}/edit` });
  if (memorial.publishedStoryCount === 0)
    attention.push({ label: "No part of their story is published yet", href: `${base}/story` });
  if (isPublished && memorial.recentUpdates.length === 0)
    attention.push({ label: "No family update has been published", href: `${base}/updates` });

  return (
    <div className="flex flex-col gap-10">
      {/* Status band */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-4 rounded-lg border px-5 py-4",
          isSuspended
            ? "border-bad/40 bg-bad-soft"
            : isPublished
              ? "border-ok/30 bg-ok-soft/50"
              : "border-line bg-surface",
        )}
      >
        <div>
          <p className="flex items-center gap-2 font-medium text-fg">
            {isPublished
              ? "This memorial is published"
              : isSuspended
                ? "This memorial has been suspended by Evermora"
                : "This memorial is a private draft"}
          </p>
          <p className="mt-0.5 text-[13px] text-fg-muted">
            {isPublished
              ? "It is live at its address, subject to your privacy setting."
              : isSuspended
                ? "Editing is disabled. Contact support to resolve this."
                : "Publish whenever you're ready — you don't have to finish every section first."}
          </p>
        </div>
        {isDraft && canEdit ? <PublishButton memorialId={memorial.id} /> : null}
      </div>

      {/* Attention */}
      {attention.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Needs your attention" />
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-raised">
            {attention.map((a) => (
              <li key={a.href + a.label}>
                <Link
                  href={a.href}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm text-fg transition-colors hover:bg-surface-subtle"
                >
                  <span>{a.label}</span>
                  <ArrowRight aria-hidden className="size-4 shrink-0 text-fg-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Status summary */}
      <section className="flex flex-col gap-3">
        <SectionHeader title="At a glance" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Visibility"
            value={<span className="text-[15px]">{VISIBILITY_LABEL[memorial.visibility]}</span>}
            hint={memorial.searchIndexingEnabled ? "Listed in search" : "Not in search results"}
            href={`${base}/customize`}
          />
          <StatCard
            label="Funeral"
            value={
              <span className="text-[15px]">
                {FUNERAL_STATUS_LABEL[memorial.funeralPlanningStatus] ??
                  memorial.funeralPlanningStatus}
              </span>
            }
            href={`${base}/funeral`}
          />
          <StatCard
            label="Tributes to review"
            value={tributesOn ? memorial.pendingTributeCount : "—"}
            hint={tributesOn ? undefined : "Tributes are turned off"}
            tone={tributesOn && memorial.pendingTributeCount > 0 ? "attention" : "default"}
            href={`${base}/tributes`}
          />
          <StatCard
            label="Story sections"
            value={memorial.publishedStoryCount}
            hint="published"
            href={`${base}/story`}
          />
          <StatCard
            label="Family updates"
            value={memorial.recentUpdates.length}
            hint="published"
            href={`${base}/updates`}
          />
          <StatCard
            label="Address"
            value={
              <span className="font-sans text-[13px] break-all">
                {memorial.canonicalSlug ? `evermora.com/${memorial.canonicalSlug}` : "Not set"}
              </span>
            }
            hint={
              memorial.aliases.length > 0
                ? `${memorial.aliases.length} older address${memorial.aliases.length === 1 ? "" : "es"} still redirect`
                : undefined
            }
            href={`${base}/settings`}
          />
        </div>
      </section>

      {/* Pre-publish checklist */}
      {isDraft ? (
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="font-serif text-lg text-fg">Before you publish</h2>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm">
            <ChecklistItem
              done={memorial.publishedStoryCount > 0}
              href={`${base}/story`}
              label="Publish at least one part of their story"
              required
            />
            <ChecklistItem
              done={Boolean(memorial.profile.dateOfBirth || memorial.profile.dateOfDeath)}
              href={`${base}/edit`}
              label="Add their dates"
            />
            <ChecklistItem
              done={memorial.visibility !== "private"}
              href={`${base}/customize`}
              label="Choose who can view the memorial"
            />
          </ul>
          <p className="mt-4 text-xs text-fg-subtle">
            Only the first item is required — everything else can come after publishing.
          </p>
        </section>
      ) : null}

      {/* Recent updates */}
      {memorial.recentUpdates.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeader
            title="Recent family updates"
            action={
              <Link
                href={`${base}/updates`}
                className="text-[13px] font-medium text-brand hover:text-brand-hover"
              >
                All updates
              </Link>
            }
          />
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-raised">
            {memorial.recentUpdates.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-4 px-5 py-3 text-sm text-fg"
              >
                <span className="truncate">{u.title}</span>
                <span className="shrink-0 font-mono text-xs text-fg-subtle">
                  {formatDate(u.publishedAt) ?? ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ChecklistItem({
  done,
  href,
  label,
  required,
}: {
  done: boolean;
  href: string;
  label: string;
  required?: boolean;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full",
          done
            ? "bg-ok text-on-brand"
            : required
              ? "border-2 border-fg-subtle"
              : "border border-line-strong",
        )}
      >
        {done ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <Link
        href={href}
        className={cn(
          "transition-colors",
          done ? "text-fg-subtle line-through" : "text-fg-muted hover:text-fg",
        )}
      >
        {label}
      </Link>
    </li>
  );
}
