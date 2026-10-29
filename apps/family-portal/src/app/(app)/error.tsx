"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, EmptyState } from "@evermora/ui";
import { PageShell } from "@/components/page-shell";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell size="app">
      <EmptyState
        className="mt-16"
        icon={<AlertTriangle aria-hidden />}
        title="Something went wrong"
        description="We couldn't load this page. This is usually temporary — try again in a moment."
        action={
          <Button onClick={reset} variant="secondary">
            Try again
          </Button>
        }
      />
    </PageShell>
  );
}
