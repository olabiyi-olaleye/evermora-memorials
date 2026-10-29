import type { Metadata } from "next";
import { roleHasPermission } from "@evermora/domain";
import { SectionHeader } from "@evermora/ui";
import { getMemorialFuneral } from "@/lib/data/funeral";
import { getMemorialDetail } from "@/lib/data/memorials";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { FuneralEditor } from "./funeral-editor";

export const metadata: Metadata = { title: "Funeral" };

export default async function FuneralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memorial = await getMemorialDetail(id);
  if (!memorial) return null;

  const canEdit = roleHasPermission(memorial.role, "funeral.manage");
  const { events, planningStatus } = await getMemorialFuneral(id);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="Funeral"
        description="Add each service, ceremony or gathering with its date, place and any instructions for guests. Every event is published or hidden on its own, independent of the memorial's status."
      />
      {canEdit ? (
        <FuneralEditor memorialId={id} events={events} planningStatus={planningStatus} />
      ) : (
        <ViewOnlyNotice>
          You have view-only access, so you can&rsquo;t edit the funeral information.
        </ViewOnlyNotice>
      )}
    </div>
  );
}
