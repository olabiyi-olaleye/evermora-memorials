export const metadata = { title: "You're offline" };

/**
 * The service worker's offline fallback (`sw.ts`) — served instead of a page
 * that can't be reached while offline. This app never caches authenticated
 * pages, so any real content always needs a connection; this is a static,
 * data-free page (it's precached once at install time).
 */
export default function OfflinePage() {
  return (
    <main
      id="main-content"
      className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <h1 className="font-serif text-xl font-medium text-fg">You&rsquo;re offline</h1>
      <p className="text-sm text-fg-muted">
        Managing a memorial needs a connection. Reconnect and try again.
      </p>
    </main>
  );
}
