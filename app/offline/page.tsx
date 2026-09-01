import type { Metadata } from "next"

import { HisaabLogo } from "@/components/brand/logo"

/// Only ever reached from the service worker's cache, never from a search
/// result — an indexed "you are offline" page would be worse than none.
export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
}

/// Cached by the service worker at install time, so this is what a navigation
/// falls back to when the network is gone.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <HisaabLogo />
      <h1 className="font-display text-xl tracking-tight">You are offline</h1>
      <p className="text-sm text-pretty text-muted-foreground">
        Balances change when other people add expenses, so Hisaab waits for a
        connection rather than showing you a figure that might already be wrong.
      </p>
    </main>
  )
}
