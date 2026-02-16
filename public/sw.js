// BookFlow Staff PWA — Service Worker
// Caches today's schedule for offline; handles push.

const CACHE_STATIC = "bookflow-staff-static-v1";
const CACHE_SCHEDULE = "bookflow-staff-schedule-v1";
const CACHE_PREFIX = "bookflow-staff";

// Install: cache shell assets
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.addAll([
        "/staff",
        "/staff/customers",
        "/staff/profile",
        "/manifest.json",
      ].map((u) => new Request(u, { cache: "reload" })).concat([]).filter(Boolean));
    }).catch(() => {})
  );
});

// Activate: claim clients, clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_STATIC && k !== CACHE_SCHEDULE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network first for API; cache schedule response for offline
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isSchedule =
    url.pathname.startsWith("/api/staff/schedule") && event.request.method === "GET";

  if (isSchedule) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_SCHEDULE).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || new Response(
          JSON.stringify({ bookings: [], offline: true }),
          { headers: { "Content-Type": "application/json" } }
        )))
    );
    return;
  }

  // Navigation: network first, fallback to cached shell
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/staff").then((r) => r || caches.match(event.request))
      )
    );
  }
});

// Push: show notification
self.addEventListener("push", (event) => {
  let data = { title: "BookFlow", body: "New update" };
  try {
    if (event.data) data = event.data.json();
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "BookFlow Staff", {
      body: data.body || data.message || "New booking",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "bookflow-push",
      data: data.data || { url: "/staff" },
      requireInteraction: !!data.requireInteraction,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/staff";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length) {
        const c = clientList[0];
        c.navigate(url);
        c.focus();
      } else if (self.clients.openWindow) {
        self.clients.openWindow(url);
      }
    })
  );
});
