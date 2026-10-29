import { Suspense, type ReactNode } from "react";
import { AppShell, Button } from "@evermora/ui";
import { AdminBreadcrumb } from "@/components/admin-breadcrumb";
import { AdminSidebar } from "@/components/admin-sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { signOutAction } from "@/lib/actions/auth";
import { requirePlatformAdmin } from "@/lib/auth";
import { getAdminCounts } from "@/lib/data/admin";
import { getMyNotifications } from "@/lib/data/notifications";
import { serverEnv } from "@/lib/env";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requirePlatformAdmin();

  if (!user.isPlatformAdmin) {
    return (
      <main
        id="main-content"
        className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 bg-canvas px-6 py-24 text-center"
      >
        <h1 className="font-serif text-2xl font-medium text-fg">Not authorised</h1>
        <p className="text-sm text-fg-muted">
          This console is for Evermora platform staff. Your account ({user.email}) doesn&rsquo;t
          have access.
        </p>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </main>
    );
  }

  const counts = await getAdminCounts();
  const appEnv = serverEnv().APP_ENV;

  return (
    <AppShell
      drawerLabel="Admin menu"
      sidebar={<AdminSidebar user={user} counts={counts} appEnv={appEnv} />}
      drawer={
        <AdminSidebar user={user} counts={counts} appEnv={appEnv} className="w-full border-r-0" />
      }
      topbar={{
        brand: <AdminBreadcrumb />,
        actions: (
          <Suspense fallback={<NotificationBell notifications={[]} unread={0} />}>
            <NotificationBellData />
          </Suspense>
        ),
      }}
    >
      {children}
    </AppShell>
  );
}

/**
 * The unread badge/list is secondary chrome — split out and streamed in
 * behind its own Suspense boundary so it never blocks the page itself
 * (nav, breadcrumb, content) from rendering while it resolves.
 */
async function NotificationBellData() {
  const { notifications, unread } = await getMyNotifications();
  return <NotificationBell notifications={notifications} unread={unread} />;
}
