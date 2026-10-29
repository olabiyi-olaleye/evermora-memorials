import type { Metadata } from "next";
import { PageHeader } from "@evermora/ui";
import { PageShell } from "@/components/page-shell";
import { requireAuthUser } from "@/lib/auth";
import { NewMemorialForm } from "./new-memorial-form";

export const metadata: Metadata = { title: "Create a memorial" };

export default async function NewMemorialPage() {
  await requireAuthUser("/memorials/new");

  return (
    <PageShell size="app">
      <PageHeader
        title="Create a memorial"
        description="Start with a name and an address. Add a portrait, their story, photos and funeral information afterwards — and publish whenever you're ready."
      />
      <div className="mt-8">
        <NewMemorialForm />
      </div>
    </PageShell>
  );
}
