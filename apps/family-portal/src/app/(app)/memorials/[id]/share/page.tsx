import type { Metadata } from "next";
import { roleHasPermission } from "@evermora/domain";
import { qrSvg } from "@evermora/utils";
import { SectionHeader } from "@evermora/ui";
import { getMemorialDetail } from "@/lib/data/memorials";
import { getMemorialShare } from "@/lib/data/share";
import { serverEnv } from "@/lib/env";
import { SharePanel } from "./share-panel";

export const metadata: Metadata = { title: "Share & QR" };

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memorial = await getMemorialDetail(id);
  if (!memorial) return null;

  const share = await getMemorialShare(id);
  const canEdit = roleHasPermission(memorial.role, "memorial.edit");
  const appUrl = serverEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const publicUrl = share.canonicalSlug ? `${appUrl}/${share.canonicalSlug}` : null;

  const assets = share.resolvers.map((r) => {
    const url = `${appUrl}/q/${r.token}`;
    return { ...r, url, svg: r.isActive ? qrSvg(url, { moduleSize: 6 }) : null };
  });

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="Share & QR"
        description="Send the memorial link, or create a printable QR code for a funeral programme, a memorial card or a banner. A printed code keeps working even if the address changes later."
      />

      {!share.published ? (
        <p className="rounded-md border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-fg">
          The memorial isn&rsquo;t published yet, so the link won&rsquo;t open for anyone else.
          Sharing tools become available once you publish it.
        </p>
      ) : !share.sharingEnabled ? (
        <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm text-fg-muted">
          Sharing is turned off for this memorial in Privacy &amp; sections.
        </p>
      ) : (
        <SharePanel
          memorialId={id}
          publicUrl={publicUrl}
          personName={memorial.profile.fullName}
          canEdit={canEdit}
          qrEnabled={share.qrCodeEnabled}
          assets={assets}
        />
      )}
    </div>
  );
}
