import type { Metadata } from "next";
import { roleHasPermission } from "@evermora/domain";
import { Avatar, SectionHeader } from "@evermora/ui";
import { getMemorialTeam } from "@/lib/data/family";
import { getMemorialDetail } from "@/lib/data/memorials";
import { FamilyPanel } from "./family-panel";

export const metadata: Metadata = { title: "Family access" };

export default async function FamilyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memorial = await getMemorialDetail(id);
  if (!memorial) return null;

  const canManage = roleHasPermission(memorial.role, "admins.manage");
  const isOwner = memorial.role === "owner";
  const team = await getMemorialTeam(id);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="Family access"
        description="Invite family and helpers, and choose what each person can do. There is always exactly one owner, and the owner can never be removed — ownership is handed over deliberately."
      />

      {canManage ? (
        <FamilyPanel
          memorialId={id}
          members={team.members}
          invites={team.invites}
          isOwner={isOwner}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm text-fg-muted">
            You can see who has access, but only an owner or admin can make changes.
          </p>
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-raised">
            {team.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="flex items-center gap-3">
                  <Avatar name={m.name} size="sm" />
                  {m.name}
                  {m.isYou ? " (you)" : ""}
                </span>
                <span className="text-fg-subtle capitalize">{m.role.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
