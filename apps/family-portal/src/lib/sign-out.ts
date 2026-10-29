/**
 * Ask the service worker to drop this account's cached authenticated pages
 * before we sign out (Phase 5P session isolation) — a signed-out device must
 * never serve this account's cached content to whoever signs in next.
 * Call this immediately before `signOutAction()`.
 */
export function clearAuthCaches(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .getRegistration()
    .then((reg) => reg?.active?.postMessage({ type: "CLEAR_AUTH_CACHES" }))
    .catch(() => {});
}
