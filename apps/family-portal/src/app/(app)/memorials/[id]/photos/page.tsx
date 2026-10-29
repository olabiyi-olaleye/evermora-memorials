import type { Metadata } from "next";
import { roleHasPermission } from "@evermora/domain";
import { SectionHeader } from "@evermora/ui";
import { getMemorialDetail } from "@/lib/data/memorials";
import { getMemorialGallery } from "@/lib/data/media";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { PhotosEditor } from "./photos-editor";

export const metadata: Metadata = { title: "Photos & memories" };

export default async function PhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memorial = await getMemorialDetail(id);
  if (!memorial) return null;

  const canEdit = roleHasPermission(memorial.role, "gallery.manage");
  const gallery = await getMemorialGallery(id);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="Photos & memories"
        description="Add photos, write a few words under each, group them into albums, choose the portrait shown at the top of the memorial, and pick the image used when the link is shared."
      />
      {canEdit ? (
        <PhotosEditor
          memorialId={id}
          albums={gallery.albums}
          photos={gallery.photos}
          portraitMediaId={gallery.portraitMediaId}
          coverMediaId={gallery.coverMediaId}
        />
      ) : (
        <ViewOnlyNotice>
          You have view-only access, so you can&rsquo;t change the photos.
        </ViewOnlyNotice>
      )}
    </div>
  );
}
