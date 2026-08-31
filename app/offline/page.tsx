import type { Metadata } from "next"

import { HisaabLogo } from "@/components/brand/logo"

export const metadata: Metadata = { title: "Offline" }

/// Cached by the service worker at install time, so this is what a navigation
/// falls back to when the network is gone.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <HisaabLogo />
      <h1 className="font-display text-xl font-semibold tracking-tight">
        You are offline
      </h1>
      <p className="text-sm text-muted-foreground text-pretty">
        Balances change when other people add expenses, so Hisaab waits for a
        connection rather than showing you a figure that might already be wrong.
      </p>
    </main>
  )
}
