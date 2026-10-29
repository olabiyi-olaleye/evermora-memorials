import type { Metadata } from "next";
import { roleHasPermission } from "@evermora/domain";
import { SectionHeader } from "@evermora/ui";
import { getMemorialDetail } from "@/lib/data/memorials";
import { getMemorialStory } from "@/lib/data/story";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { StoryEditor } from "./story-editor";

export const metadata: Metadata = { title: "Their story" };

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memorial = await getMemorialDetail(id);
  if (!memorial) return null;

  const canEdit = roleHasPermission(memorial.role, "story.edit");
  const { sections, milestones } = await getMemorialStory(id);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="Their story"
        description="Write about their life in as many or as few sections as you like, and add a timeline of moments that mattered. A published section or a portrait is all you need to publish the memorial."
      />

      {canEdit ? (
        <StoryEditor memorialId={id} sections={sections} milestones={milestones} />
      ) : (
        <ViewOnlyNotice>
          You have view-only access, so you can&rsquo;t edit the story.
        </ViewOnlyNotice>
      )}
    </div>
  );
}
