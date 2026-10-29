import type { Metadata } from "next";
import { roleHasPermission } from "@evermora/domain";
import { SectionHeader } from "@evermora/ui";
import { getMemorialDetail } from "@/lib/data/memorials";
import { getMemorialUpdates } from "@/lib/data/updates";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { UpdatesEditor } from "./updates-editor";

export const metadata: Metadata = { title: "Family updates" };

export default async function UpdatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memorial = await getMemorialDetail(id);
  if (!memorial) return null;

  const canEdit = roleHasPermission(memorial.role, "updates.publish");
  const updates = await getMemorialUpdates(id);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="Family updates"
        description="Official notices from the family — a change of plans, streaming details, a thank-you after the service. One authoritative voice; not a social feed."
      />
      {canEdit ? (
        <UpdatesEditor memorialId={id} updates={updates} />
      ) : (
        <ViewOnlyNotice>
          You have view-only access, so you can&rsquo;t post family updates.
        </ViewOnlyNotice>
      )}
    </div>
  );
}
