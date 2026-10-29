import type { Metadata } from "next";
import { roleHasPermission } from "@evermora/domain";
import { SectionHeader } from "@evermora/ui";
import { getMemorialDetail } from "@/lib/data/memorials";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { SlugForm } from "./slug-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memorial = await getMemorialDetail(id);
  if (!memorial) return null;

  const canEdit = roleHasPermission(memorial.role, "memorial.edit");

  return (
    <div className="flex flex-col gap-12">
      <SectionHeader
        title="Settings"
        description="The memorial's address, and administrative controls."
      />

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-lg text-fg">Memorial address</h2>
        {memorial.aliases.length > 0 ? (
          <p className="text-[13px] text-fg-subtle">
            Older addresses that still redirect here: {memorial.aliases.join(", ")}
          </p>
        ) : null}
        {canEdit && memorial.canonicalSlug ? (
          <SlugForm memorialId={memorial.id} currentSlug={memorial.canonicalSlug} />
        ) : canEdit ? (
          <p className="text-sm text-fg-muted">This memorial doesn&rsquo;t have an address yet.</p>
        ) : (
          <ViewOnlyNotice>Only an owner or admin can change the memorial address.</ViewOnlyNotice>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-lg text-fg">Archiving &amp; deletion</h2>
        <p className="max-w-prose text-sm leading-relaxed text-fg-muted">
          Archiving a memorial (taking it offline while keeping everything) and permanent deletion
          are being built. For now, you can make the memorial private on the{" "}
          <a
            href={`/memorials/${memorial.id}/customize`}
            className="font-medium text-brand underline"
          >
            Privacy &amp; sections
          </a>{" "}
          page, which stops the public link resolving immediately.
        </p>
      </section>
    </div>
  );
}
