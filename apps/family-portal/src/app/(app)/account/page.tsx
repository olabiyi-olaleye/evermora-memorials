import type { Metadata } from "next";
import { Avatar, Card, PageHeader } from "@evermora/ui";
import { PageShell } from "@/components/page-shell";
import { requireAuthUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireAuthUser("/account");
  const rows: [string, string][] = [
    ["Name", user.displayName ?? "—"],
    ["Email", user.email ?? "—"],
  ];
  if (user.isPlatformAdmin) rows.push(["Role", "Evermora staff"]);

  return (
    <PageShell size="app">
      <PageHeader title="Account" description="Your Evermora sign-in details." />

      <Card className="mt-8">
        <div className="flex items-center gap-4 border-b border-line p-5">
          <Avatar name={user.displayName ?? user.email ?? "You"} size="lg" />
          <div>
            <p className="font-serif text-lg text-fg">{user.displayName ?? "Your account"}</p>
            <p className="text-sm text-fg-subtle">{user.email}</p>
          </div>
        </div>
        <dl className="flex flex-col">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between gap-6 border-b border-line px-5 py-3.5 text-sm last:border-0"
            >
              <dt className="text-fg-subtle">{k}</dt>
              <dd className="text-right font-medium text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <p className="mt-4 text-[13px] text-fg-subtle">
        Sign out from the account menu at the bottom of the sidebar. Editing your name, email and
        password is coming soon.
      </p>
    </PageShell>
  );
}
