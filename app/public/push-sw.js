// Minimal push-only service worker for staff alerts (new orders/calls/bookings,
// kitchen done). Shows an OS notification even while the screen is locked —
// this is the one thing a backgrounded/locked browser tab cannot do on its own.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Louis Wine", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Louis Wine";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon.png",
      badge: "/icon.png",
      vibrate: [400, 150, 400, 150, 400, 150, 400, 150, 400],
      tag: data.tag || "lwo-alert",
      renotify: true,
      requireInteraction: true,
      data: { url: data.url || "/staff" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/staff";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
