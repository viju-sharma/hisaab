"use client"

import { useEffect } from "react"

/// Registers the hand-written service worker once the page is interactive, so
/// registration never competes with first paint.
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // A failed registration costs offline support, nothing else — the app
          // works without it, so this stays silent.
        })
    }

    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })

    return () => window.removeEventListener("load", register)
  }, [])

  return null
}
