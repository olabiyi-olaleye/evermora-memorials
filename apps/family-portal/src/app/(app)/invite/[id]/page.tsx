import type { Metadata } from "next";
import Link from "next/link";
import { requireAuthUser } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { AcceptInviteButton } from "./accept-invite-button";

export const metadata: Metadata = { title: "Invitation" };

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  content_editor: "Content editor",
  tribute_moderator: "Tribute moderator",
  viewer: "Viewer",
};

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAuthUser(`/invite/${id}`);

  const supabase = await getSupabaseServer();
  const { data } = await supabase.rpc("memorial_invite_preview", { membership: id }).maybeSingle();

  if (!data) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center">
        <h1 className="font-serif text-2xl font-medium text-fg">
          This invitation isn&rsquo;t available
        </h1>
        <p className="text-sm text-fg-muted">
          It may have already been accepted, been cancelled, or been sent to a different email
          address than the one you&rsquo;re signed in with.
        </p>
        <Link href="/" className="text-sm text-fg-muted underline hover:text-fg">
          Go to your memorials
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-6 py-16 text-center">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
        You&rsquo;re invited
      </p>
      <h1 className="font-serif text-2xl font-medium text-fg">{data.memorial_name}</h1>
      <p className="text-sm text-fg-muted">
        {data.invited_by_name ? `${data.invited_by_name} has` : "You&rsquo;ve been"} invited you to
        help with this memorial as{" "}
        <span className="font-medium text-fg">{ROLE_LABEL[data.role] ?? data.role}</span>.
      </p>
      <AcceptInviteButton membershipId={id} />
      <Link href="/" className="text-xs text-fg-subtle underline hover:text-fg">
        Not now
      </Link>
    </div>
  );
}
