import type { Metadata } from "next";
import Link from "next/link";
import { cn, EmptyState, PageHeader } from "@evermora/ui";
import { PageShell } from "@/components/page-shell";
import { listReports } from "@/lib/data/admin";
import { ReportRow } from "./report-row";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const { all } = await searchParams;
  const includeResolved = all === "1";
  const reports = await listReports(includeResolved);
  const tabs = [
    { key: "", label: "Open", href: "/reports" },
    { key: "1", label: "All", href: "/reports?all=1" },
  ];

  return (
    <PageShell size="app">
      <PageHeader
        title="Reports"
        description="Abuse, privacy and accuracy reports, oldest first. Resolving a report is audited."
      />

      <nav className="mt-8 flex gap-1 border-b border-line" aria-label="Filter reports">
        {tabs.map((t) => {
          const active = (all ?? "") === t.key;
          return (
            <Link
              key={t.key}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-brand text-brand"
                  : "border-transparent text-fg-muted hover:text-fg",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {reports.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="Nothing in the queue"
          description="No reports need attention right now."
        />
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {reports.map((r) => (
            <ReportRow key={r.id} report={r} />
          ))}
        </ul>
      )}
    </PageShell>
  );
}
