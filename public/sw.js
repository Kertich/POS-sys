const CACHE_NAME = "soko-pos-v1";
const APP_ROUTES = [
  "/",
  "/home",
  "/login",
  "/sell",
  "/checkout",
  "/held",
  "/history",
  "/shift/close",
  "/receipt/offline",
];
const STATIC_ASSETS = ["/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const route of APP_ROUTES) {
      try {
        const response = await fetch(route, { cache: "reload" });
        if (!response.ok) throw new Error(`Precache failed for ${route}: ${response.status}`);
        await cache.put(route, response.clone());
        const html = await response.text();
        const assets = [...html.matchAll(/(?:src|href)="([^"]*\/_next\/static\/[^"]+)"/g)]
          .map((match) => new URL(match[1], self.location.origin))
          .filter((url) => url.origin === self.location.origin);
        for (const asset of assets) {
          if (await cache.match(asset.href)) continue;
          const assetResponse = await fetch(asset.href);
          if (assetResponse.ok) await cache.put(asset.href, assetResponse);
        }
      } catch (error) {
        console.error(`Could not precache app route ${route}`, error);
      }
    }
    await cache.addAll(STATIC_ASSETS);
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          const pathname = new URL(event.request.url).pathname;
          if (pathname.startsWith("/receipt/")) {
            const receiptFallback = await caches.match("/receipt/offline");
            if (!receiptFallback) return Response.error();
            const headers = new Headers(receiptFallback.headers);
            headers.delete("content-length");
            headers.delete("content-encoding");
            return new Response((await receiptFallback.text()).replaceAll("/receipt/offline", pathname), {
              status: receiptFallback.status,
              headers,
            });
          }
          return await caches.match("/home") || Response.error();
        }
        return Response.error();
      }),
  );
});
