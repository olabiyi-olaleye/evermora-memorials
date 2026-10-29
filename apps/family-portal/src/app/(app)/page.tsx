import Link from "next/link";
import { Plus } from "lucide-react";
import { Avatar, Button, Card, EmptyState, PageHeader, StatusBadge } from "@evermora/ui";
import { PageShell } from "@/components/page-shell";
import { requireAuthUser } from "@/lib/auth";
import { listMyMemorials } from "@/lib/data/memorials";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireAuthUser();
  const memorials = await listMyMemorials(user.id);
  const firstName = user.displayName?.split(" ")[0];
  const needsReview = memorials.filter((m) => m.pendingTributeCount > 0);
  const totalPending = needsReview.reduce((n, m) => n + m.pendingTributeCount, 0);

  return (
    <PageShell size="dashboard">
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        description="The memorials your family keeps on Evermora."
        actions={
          <Button asChild>
            <Link href="/memorials/new">
              <Plus aria-hidden />
              New memorial
            </Link>
          </Button>
        }
      />

      {memorials.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="No memorials yet"
          description="Start with a name, dates and a photograph. Nothing is public until you choose to publish."
          action={
            <Button asChild>
              <Link href="/memorials/new">Create a memorial</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {totalPending > 0 ? (
            <div className="rounded-lg border border-warn/30 bg-warn-soft/50 px-4 py-3 text-sm text-fg">
              {totalPending} tribute{totalPending === 1 ? "" : "s"} awaiting review
              {needsReview.length === 1 ? ` on ${needsReview[0]!.fullName}'s memorial` : ""}.
            </div>
          ) : null}

          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {memorials.map((m) => (
              <li key={m.id}>
                <Link href={`/memorials/${m.id}`} className="group block h-full">
                  <Card className="h-full transition-colors group-hover:border-line-strong">
                    <div className="flex flex-col gap-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <Avatar name={m.fullName} size="lg" />
                        <StatusBadge status={m.status} />
                      </div>
                      <div>
                        <p className="font-serif text-lg leading-tight text-fg">{m.fullName}</p>
                        <p className="mt-1 font-mono text-[12px] text-fg-subtle">
                          {m.canonicalSlug ? `evermora.com/${m.canonicalSlug}` : "No address yet"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[13px] text-fg-muted">
                        <span className="capitalize">{m.role.replace("_", " ")}</span>
                        {m.pendingTributeCount > 0 ? (
                          <span className="font-medium text-warn">
                            {m.pendingTributeCount} to review
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PageShell>
  );
}
