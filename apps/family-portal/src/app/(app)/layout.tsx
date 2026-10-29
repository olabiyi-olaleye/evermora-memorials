import { Suspense, type ReactNode } from "react";
import { AppShell } from "@evermora/ui";
import { FamilyBreadcrumb } from "@/components/family-breadcrumb";
import { FamilySidebar } from "@/components/family-sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { requireAuthUser } from "@/lib/auth";
import { listMyMemorials } from "@/lib/data/memorials";
import { getMyNotifications } from "@/lib/data/notifications";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireAuthUser();
  const memorials = await listMyMemorials(user.id);

  return (
    <AppShell
      drawerLabel="Menu"
      sidebar={<FamilySidebar user={user} memorials={memorials} />}
      drawer={<FamilySidebar user={user} memorials={memorials} className="w-full border-r-0" />}
      topbar={{
        brand: <FamilyBreadcrumb memorials={memorials} />,
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
