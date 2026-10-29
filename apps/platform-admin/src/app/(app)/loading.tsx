import { Skeleton } from "@evermora/ui";
import { PageShell } from "@/components/page-shell";

export default function Loading() {
  return (
    <PageShell>
      <Skeleton className="h-8 w-40 rounded-md" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="mt-6 h-64 w-full rounded-lg" />
    </PageShell>
  );
}
