import type { Metadata } from "next";
import Link from "next/link";
import { cn, EmptyState, PageHeader } from "@evermora/ui";
import { PageShell } from "@/components/page-shell";
import { requirePlatformAdmin } from "@/lib/auth";
import { listServiceRequests } from "@/lib/data/admin";
import { ServiceRequestRow } from "./service-request-row";

export const metadata: Metadata = { title: "Service requests" };

export default async function ServiceRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const { all } = await searchParams;
  const includeClosed = all === "1";
  const [requests, me] = await Promise.all([
    listServiceRequests(includeClosed),
    requirePlatformAdmin(),
  ]);
  const tabs = [
    { key: "", label: "Open", href: "/service-requests" },
    { key: "1", label: "All", href: "/service-requests?all=1" },
  ];

  return (
    <PageShell size="app">
      <PageHeader
        title="Service requests"
        description="Inbound requests for funeral and memorial help. Assign one to yourself, then move it forward."
      />

      <nav className="mt-8 flex gap-1 border-b border-line" aria-label="Filter service requests">
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

      {requests.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="Nothing in the queue"
          description="No service requests need attention right now."
        />
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {requests.map((r) => (
            <ServiceRequestRow key={r.id} request={r} meId={me.id} />
          ))}
        </ul>
      )}
    </PageShell>
  );
}
