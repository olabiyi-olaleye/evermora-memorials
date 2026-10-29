import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader, SectionHeader, StatCard, StatusBadge } from "@evermora/ui";
import { PageShell } from "@/components/page-shell";
import { getAdminOverview } from "@/lib/data/admin";
import { REPORT_REASON_LABEL, SERVICE_TYPE_LABEL } from "@/lib/labels";

export const metadata: Metadata = { title: "Overview" };

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default async function OverviewPage() {
  const { counts, openReports, openServiceRequests, recentMemorials } = await getAdminOverview();

  return (
    <PageShell size="dashboard">
      <PageHeader
        title="Overview"
        description="Platform operations at a glance. Every moderation action is audited."
      />

      {/* KPI strip */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Memorials" value={counts.memorials} href="/memorials" />
        <StatCard label="Published" value={counts.published} href="/memorials" />
        <StatCard
          label="Suspended"
          value={counts.suspended}
          tone={counts.suspended > 0 ? "attention" : "default"}
          href="/memorials?status=suspended"
        />
        <StatCard
          label="Open reports"
          value={counts.openReports}
          tone={counts.openReports > 0 ? "attention" : "default"}
          href="/reports"
        />
        <StatCard
          label="Service requests"
          value={counts.newServiceRequests}
          tone={counts.newServiceRequests > 0 ? "attention" : "default"}
          href="/service-requests"
        />
      </div>

      {/* Priority work */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Queue
          title="Reports to triage"
          href="/reports"
          empty="No open reports — the moderation queue is clear."
          items={openReports.map((r) => ({
            key: r.id,
            primary: REPORT_REASON_LABEL[r.reason] ?? r.reason,
            secondary: r.memorialName ?? (r.tributeId ? "A tribute" : "—"),
            meta: timeAgo(r.createdAt),
            badge: <StatusBadge status={r.status} />,
          }))}
        />
        <Queue
          title="Service requests waiting"
          href="/service-requests"
          empty="No service requests need attention."
          items={openServiceRequests.map((r) => ({
            key: r.id,
            primary: SERVICE_TYPE_LABEL[r.serviceType] ?? r.serviceType,
            secondary: `${r.contactName}${r.memorialName ? ` · ${r.memorialName}` : ""}`,
            meta: timeAgo(r.createdAt),
            badge: <StatusBadge status={r.status} />,
          }))}
        />
      </div>

      {/* Recent activity */}
      <section className="mt-10 flex flex-col gap-3">
        <SectionHeader
          title="Recent memorials"
          description="The newest memorials on the platform. A full audit feed arrives with the audit-log query."
        />
        {recentMemorials.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-subtle">
            No memorials yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-raised">
            {recentMemorials.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <span className="flex items-center gap-2.5">
                  <span className="font-medium text-fg">{m.fullName}</span>
                  <StatusBadge status={m.status} />
                </span>
                <span className="font-mono text-[11.5px] text-fg-subtle">
                  {m.slug ? `evermora.com/${m.slug}` : "no address"} · {timeAgo(m.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}

interface QueueItem {
  key: string;
  primary: string;
  secondary: string;
  meta: string;
  badge: ReactNode;
}

function Queue({
  title,
  href,
  empty,
  items,
}: {
  title: string;
  href: string;
  empty: string;
  items: QueueItem[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title={title}
        action={
          <Link
            href={href}
            className="flex items-center gap-1 text-[13px] font-medium text-brand hover:text-brand-hover"
          >
            View all <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        }
      />
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-subtle">
          {empty}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-raised">
          {items.map((it) => (
            <li key={it.key}>
              <Link
                href={href}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-fg">{it.primary}</span>
                  <span className="block truncate text-[12.5px] text-fg-muted">{it.secondary}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {it.badge}
                  <span className="font-mono text-[11px] text-fg-subtle">{it.meta}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
