import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Eye } from "lucide-react";
import { Avatar, Button, EntityHeader, StatusBadge } from "@evermora/ui";
import { PageShell } from "@/components/page-shell";
import { requireAuthUser } from "@/lib/auth";
import { getMemorialDetail } from "@/lib/data/memorials";
import { formatLifespan, VISIBILITY_LABEL } from "@/lib/format";

export default async function MemorialLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuthUser(`/memorials/${id}`);
  const memorial = await getMemorialDetail(id);
  if (!memorial) notFound();

  const { profile } = memorial;
  const lifespan = formatLifespan(profile.dateOfBirth, profile.dateOfDeath);
  const publicUrl =
    memorial.status === "published" && memorial.canonicalSlug
      ? `${process.env.NEXT_PUBLIC_APP_URL}/${memorial.canonicalSlug}`
      : null;

  return (
    <PageShell size="dashboard">
      <EntityHeader
        media={<Avatar name={profile.fullName} size="lg" />}
        title={profile.fullName}
        meta={
          <>
            {lifespan ? <span className="font-mono text-[12.5px]">{lifespan}</span> : null}
            <StatusBadge status={memorial.status} />
            <StatusBadge
              status={memorial.visibility}
              label={VISIBILITY_LABEL[memorial.visibility] ?? memorial.visibility}
            />
            {memorial.canonicalSlug ? (
              <span className="font-mono text-[12.5px] text-fg-subtle">
                evermora.com/{memorial.canonicalSlug}
              </span>
            ) : null}
          </>
        }
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/memorials/${memorial.id}/preview`}>
                <Eye aria-hidden />
                Preview
              </Link>
            </Button>
            {publicUrl ? (
              <Button asChild variant="secondary" size="sm">
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  View memorial
                  <ArrowUpRight aria-hidden />
                </a>
              </Button>
            ) : null}
          </>
        }
      />
      <div className="mt-8">{children}</div>
    </PageShell>
  );
}
