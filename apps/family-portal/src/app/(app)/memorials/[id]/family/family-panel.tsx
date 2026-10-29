"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, RotateCcw, UserMinus, UserX } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FormField,
  IconButton,
  Input,
  Select,
} from "@evermora/ui";
import { FormError } from "@/components/form";
import type { PendingInvite, TeamMember } from "@/lib/data/family";
import {
  changeMemorialRoleAction,
  inviteMemorialAdminAction,
  transferMemorialOwnershipAction,
} from "@/lib/actions/family";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  content_editor: "Content editor",
  tribute_moderator: "Tribute moderator",
  viewer: "Viewer",
};

type ManageRole = "admin" | "content_editor" | "tribute_moderator" | "viewer";
const INVITE_ROLES: ManageRole[] = ["admin", "content_editor", "tribute_moderator", "viewer"];

const ROLE_HELP: Record<string, string> = {
  admin: "Everything except deleting the memorial or handing over ownership.",
  content_editor: "Edit the story, photos, funeral details and family updates.",
  tribute_moderator: "Review and approve visitor tributes.",
  viewer: "See the private memorial, but not make changes.",
};

type Res = { ok: boolean; error?: { message: string } };

export function FamilyPanel({
  memorialId,
  members,
  invites,
  isOwner,
}: {
  memorialId: string;
  members: TeamMember[];
  invites: PendingInvite[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function act(fn: () => Promise<Res>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setError(res.error?.message ?? "Something went wrong.");
    });
  }

  const transferTargets = members.filter(
    (m) => m.role !== "owner" && m.status === "active" && m.profileId,
  );

  return (
    <div className="flex flex-col gap-10">
      <FormError message={error} />

      <InviteForm
        pending={pending}
        onInvite={(email, role) =>
          act(() => inviteMemorialAdminAction({ memorialId, email, role }))
        }
      />

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-lg text-fg">People with access</h2>
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-raised">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={m.name} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">
                    {m.name}
                    {m.isYou ? " (you)" : ""}
                  </p>
                  {m.status === "suspended" ? (
                    <Badge tone="warn" withDot className="mt-0.5">
                      Suspended
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.role === "owner" ? (
                  <span className="text-[13px] font-medium text-fg-muted">Owner</span>
                ) : m.isYou ? (
                  <span className="text-[13px] text-fg-subtle">{ROLE_LABEL[m.role]}</span>
                ) : (
                  <>
                    <Select
                      aria-label={`${m.name}'s role`}
                      selectSize="sm"
                      className="w-auto"
                      value={m.role}
                      disabled={pending}
                      onChange={(e) =>
                        act(() =>
                          changeMemorialRoleAction({
                            memorialId,
                            membershipId: m.id,
                            role: e.target.value as ManageRole,
                          }),
                        )
                      }
                    >
                      {INVITE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </Select>
                    <MemberMenu
                      name={m.name}
                      suspended={m.status !== "active"}
                      disabled={pending}
                      onSuspend={() =>
                        act(() =>
                          changeMemorialRoleAction({
                            memorialId,
                            membershipId: m.id,
                            status: "suspended",
                          }),
                        )
                      }
                      onRestore={() =>
                        act(() =>
                          changeMemorialRoleAction({
                            memorialId,
                            membershipId: m.id,
                            status: "active",
                          }),
                        )
                      }
                      onRemove={() =>
                        act(() =>
                          changeMemorialRoleAction({
                            memorialId,
                            membershipId: m.id,
                            status: "revoked",
                          }),
                        )
                      }
                    />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {invites.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-serif text-lg text-fg">Pending invitations</h2>
          <ul className="flex flex-col gap-2">
            {invites.map((i) => (
              <li
                key={i.id}
                className="flex flex-col gap-1.5 rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-fg">{i.email}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-fg-subtle">{ROLE_LABEL[i.role]}</span>
                    <button
                      type="button"
                      className="text-xs text-fg-muted underline hover:text-bad"
                      disabled={pending}
                      onClick={() =>
                        act(() =>
                          changeMemorialRoleAction({
                            memorialId,
                            membershipId: i.id,
                            status: "revoked",
                          }),
                        )
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <InviteLink membershipId={i.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isOwner && transferTargets.length > 0 ? (
        <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
          <h2 className="font-serif text-lg text-fg">Hand over ownership</h2>
          <p className="max-w-prose text-[13px] leading-relaxed text-fg-muted">
            The new owner takes full control; you stay on as an admin. This can&rsquo;t be undone
            without their agreement.
          </p>
          <TransferControl
            pending={pending}
            targets={transferTargets}
            onTransfer={(profileId) =>
              act(() =>
                transferMemorialOwnershipAction({ memorialId, newOwnerProfileId: profileId }),
              )
            }
          />
        </section>
      ) : null}
    </div>
  );
}

function MemberMenu({
  name,
  suspended,
  disabled,
  onSuspend,
  onRestore,
  onRemove,
}: {
  name: string;
  suspended: boolean;
  disabled?: boolean;
  onSuspend: () => void;
  onRestore: () => void;
  onRemove: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton aria-label={`Manage ${name}`} variant="ghost" size="sm" disabled={disabled}>
          <MoreHorizontal aria-hidden />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {suspended ? (
          <DropdownMenuItem onSelect={onRestore}>
            <RotateCcw aria-hidden />
            Restore access
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={onSuspend}>
            <UserX aria-hidden />
            Suspend access
          </DropdownMenuItem>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
              <UserMinus aria-hidden />
              Remove
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent
            title={`Remove ${name}'s access?`}
            description="They will lose access to this memorial. You can invite them again later."
            confirmLabel="Remove"
            tone="danger"
            onConfirm={onRemove}
          />
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InviteLink({ membershipId }: { membershipId: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined" ? `${window.location.origin}/invite/${membershipId}` : "";
  return (
    <div className="flex items-center gap-2 text-xs text-fg-subtle">
      <code className="truncate font-mono">{url || `/invite/${membershipId}`}</code>
      <button
        type="button"
        className="shrink-0 underline hover:text-fg"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* noop */
          }
        }}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

function InviteForm({
  pending,
  onInvite,
}: {
  pending: boolean;
  onInvite: (email: string, role: ManageRole) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ManageRole>("content_editor");

  return (
    <Card>
      <CardBody>
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            onInvite(email.trim(), role);
            setEmail("");
          }}
        >
          <h2 className="font-serif text-lg text-fg">Invite someone</h2>
          <div className="grid gap-5 sm:grid-cols-[1fr_14rem]">
            <FormField label="Their email" required>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </FormField>
            <FormField label="Role" description={ROLE_HELP[role]}>
              <Select value={role} onChange={(e) => setRole(e.target.value as ManageRole)}>
                {INVITE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-fg-subtle">
              They&rsquo;ll get a link. Until invitation emails are automatic, copy the link from
              the pending list and send it to them.
            </p>
            <Button type="submit" loading={pending} disabled={!email.trim()}>
              Send invitation
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function TransferControl({
  pending,
  targets,
  onTransfer,
}: {
  pending: boolean;
  targets: TeamMember[];
  onTransfer: (profileId: string) => void;
}) {
  const [profileId, setProfileId] = useState(targets[0]?.profileId ?? "");
  const target = targets.find((t) => t.profileId === profileId);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <FormField label="New owner" className="w-auto">
        <Select className="w-auto" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
          {targets.map((t) => (
            <option key={t.id} value={t.profileId ?? ""}>
              {t.name}
            </option>
          ))}
        </Select>
      </FormField>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="secondary" disabled={pending || !profileId}>
            Transfer
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent
          title="Hand over ownership?"
          description={`${target?.name ?? "This person"} will become the owner with full control. You'll stay on as an admin.`}
          confirmLabel="Hand over ownership"
          tone="danger"
          onConfirm={() => onTransfer(profileId)}
        />
      </AlertDialog>
    </div>
  );
}
