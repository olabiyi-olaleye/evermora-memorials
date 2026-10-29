import { Skeleton } from "@evermora/ui";
import { PageShell } from "@/components/page-shell";

export default function Loading() {
  return (
    <PageShell size="dashboard">
      <Skeleton className="h-24 w-full rounded-lg" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    </PageShell>
  );
}
