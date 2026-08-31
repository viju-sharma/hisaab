// Hand-written on purpose: next-pwa and Serwist both need webpack config, and
// Turbopack is the default bundler in Next 16.

const VERSION = "hisaab-v1"
const SHELL = `${VERSION}-shell`
const OFFLINE_URL = "/offline"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll([OFFLINE_URL, "/brand/mark.svg"]))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  // Never touch anything authenticated or mutating: a stale balance is worse
  // than no balance.
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api/")) return

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL)
        return (await cache.match(OFFLINE_URL)) ?? Response.error()
      })
    )
    return
  }

  // Static assets: serve from cache, refresh in the background.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/")
  ) {
    event.respondWith(
      caches.open(SHELL).then(async (cache) => {
        const cached = await cache.match(request)
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
          .catch(() => cached)
        return cached ?? network
      })
    )
  }
})

self.addEventListener("push", (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Hisaab", {
      body: payload.body,
      icon: "/icons/icon-192",
      badge: "/icons/icon-192",
      tag: payload.tag,
      data: { href: payload.href ?? "/dashboard" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const href = event.notification.data?.href ?? "/dashboard"

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Reuse an open tab rather than piling up windows.
        for (const client of clientList) {
          if (client.url.includes(href) && "focus" in client) return client.focus()
        }
        for (const client of clientList) {
          if ("navigate" in client) return client.navigate(href).then((c) => c?.focus())
        }
        return self.clients.openWindow(href)
      })
  )
})
