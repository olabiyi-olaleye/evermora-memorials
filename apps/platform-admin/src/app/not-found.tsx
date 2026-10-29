import Link from "next/link";
import { Button } from "@evermora/ui";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <h1 className="font-serif text-2xl font-medium text-fg">Page not found</h1>
      <p className="max-w-sm text-sm text-fg-muted">
        This page doesn&rsquo;t exist in the admin console.
      </p>
      <Button asChild variant="secondary">
        <Link href="/">Back to Overview</Link>
      </Button>
    </main>
  );
}
