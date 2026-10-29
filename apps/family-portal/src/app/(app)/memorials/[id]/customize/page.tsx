import type { Metadata } from "next";
import { roleHasPermission } from "@evermora/domain";
import { SectionHeader } from "@evermora/ui";
import { getMemorialDetail } from "@/lib/data/memorials";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { FeaturesForm } from "./features-form";
import { PrivacyForm } from "./privacy-form";

export const metadata: Metadata = { title: "Privacy & sections" };

export default async function CustomizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memorial = await getMemorialDetail(id);
  if (!memorial) return null;

  const canEdit = roleHasPermission(memorial.role, "memorial.edit");
  const canManagePrivacy = roleHasPermission(memorial.role, "privacy.manage");

  return (
    <div className="flex flex-col gap-12">
      <SectionHeader
        title="Privacy & sections"
        description="Control who can open the memorial, and which parts are available on it."
      />

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-lg text-fg">Privacy</h2>
        {canManagePrivacy ? (
          <PrivacyForm
            memorialId={memorial.id}
            visibility={memorial.visibility}
            searchIndexingEnabled={memorial.searchIndexingEnabled}
          />
        ) : (
          <ViewOnlyNotice>Only an owner or admin can change privacy settings.</ViewOnlyNotice>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-lg text-fg">Sections</h2>
        {canEdit ? (
          <FeaturesForm memorialId={memorial.id} features={memorial.features} />
        ) : (
          <ViewOnlyNotice>
            You have view-only access, so you can&rsquo;t change which sections are available.
          </ViewOnlyNotice>
        )}
      </section>
    </div>
  );
}
