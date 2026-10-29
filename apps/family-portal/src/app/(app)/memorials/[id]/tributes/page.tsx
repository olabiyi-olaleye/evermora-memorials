import type { Metadata } from "next";
import { roleHasPermission } from "@evermora/domain";
import { SectionHeader } from "@evermora/ui";
import { getMemorialDetail } from "@/lib/data/memorials";
import { getMemorialTributes } from "@/lib/data/tributes";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { TributesModeration } from "./tributes-moderation";

export const metadata: Metadata = { title: "Tributes" };

export default async function TributesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memorial = await getMemorialDetail(id);
  if (!memorial) return null;

  const canModerate = roleHasPermission(memorial.role, "tributes.moderate");
  const tributes = await getMemorialTributes(id);

  const pending = tributes.filter((t) => t.status === "pending" || t.status === "reported");
  const approved = tributes.filter((t) => t.status === "approved");
  const other = tributes.filter((t) => ["rejected", "hidden"].includes(t.status));

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="Tributes"
        description={
          memorial.features.tributeModerationEnabled
            ? "New tributes wait here for your review before they appear on the memorial."
            : "Review is off — new tributes appear straight away. You can still hide any that shouldn't be there."
        }
      />
      {canModerate ? (
        <TributesModeration memorialId={id} pending={pending} approved={approved} other={other} />
      ) : (
        <ViewOnlyNotice>You don&rsquo;t have permission to moderate tributes here.</ViewOnlyNotice>
      )}
    </div>
  );
}
