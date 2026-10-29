import type { Metadata } from "next";
import { roleHasPermission } from "@evermora/domain";
import { SectionHeader } from "@evermora/ui";
import { getMemorialDetail } from "@/lib/data/memorials";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { EditProfileForm } from "./edit-form";

export const metadata: Metadata = { title: "Basic information" };

export default async function EditMemorialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memorial = await getMemorialDetail(id);
  if (!memorial) return null;

  const canEdit = roleHasPermission(memorial.role, "memorial.edit");

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Basic information"
        description="The essentials that appear at the top of the memorial. None of it is required to publish — you can come back any time."
      />
      {canEdit ? (
        <EditProfileForm memorialId={memorial.id} profile={memorial.profile} />
      ) : (
        <ViewOnlyNotice />
      )}
    </div>
  );
}
