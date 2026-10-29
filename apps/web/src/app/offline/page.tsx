export const metadata = { title: "You're offline" };

/**
 * The service worker's offline fallback (`sw.ts`) — served instead of a page
 * that can't be fetched while offline and wasn't already cached from an
 * earlier visit. Deliberately static: it's rendered once and precached at
 * install time, so it must not depend on live data.
 */
export default function OfflinePage() {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center"
    >
      <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">Evermora</p>
      <h1 className="font-serif text-[clamp(1.5rem,1.3rem+1vw,2rem)] text-fg">
        You&rsquo;re offline
      </h1>
      <p className="text-sm leading-relaxed text-fg-muted">
        This page hasn&rsquo;t been saved for offline viewing. Reconnect and try again — a memorial
        you&rsquo;ve already opened will still work without a connection.
      </p>
    </main>
  );
}
