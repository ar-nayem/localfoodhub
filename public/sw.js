// Service worker — intentionally does almost nothing.
//
// Its one job is an offline fallback: when a page navigation fails because there's no
// network, show /offline.html instead of the browser's own error screen. The Play Store
// wrapper (a Trusted Web Activity) treats that browser error screen as a crash.
//
// It deliberately does NOT cache pages or API responses. Most pages here are per-user and
// signed-in (orders, profile, the vendor dashboard); serving them from a cache would risk
// showing stale order status, or one account's page after a sign-out. Network-first with
// no page cache means the app is exactly as fresh as it was before this file existed.

// Renamed again at the শখের খাবার rebrand (was foodivo-offline-v1, originally
// lfh-offline-v1). The version suffix matters: changing this file is what makes the
// browser install the new worker, and the new name means the activate handler drops the
// old cache holding the previous brand's offline page.
const CACHE = "shokherkhabar-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" }))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Page loads only. Everything else — API calls, images, scripts, uploads — goes
  // straight to the network untouched, exactly as if there were no service worker.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL).then((cached) => cached || Response.error()))
  );
});
