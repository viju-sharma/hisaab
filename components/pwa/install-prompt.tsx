"use client"

import { useEffect, useState } from "react"
import { Download, Share } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useIsHydrated } from "@/hooks/use-hydrated"

type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

/// Chrome hands us an install event; iOS never does, so it gets instructions
/// instead of a button that would do nothing.
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null)
  const hydrated = useIsHydrated()

  const installed =
    hydrated && window.matchMedia("(display-mode: standalone)").matches
  const isIOS =
    hydrated &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !("MSStream" in window)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as InstallEvent)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [])

  if (installed) return null

  if (isIOS) {
    return (
      <div className="rounded-xl border p-4">
        <p className="text-sm font-medium">Add Hisaab to your home screen</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          Tap <Share className="inline size-3.5" /> then &ldquo;Add to Home
          Screen&rdquo;. Notifications only work once it is installed.
        </p>
      </div>
    )
  }

  if (!deferred) return null

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
      <span>
        <span className="block text-sm font-medium">Install Hisaab</span>
        <span className="block text-xs text-muted-foreground">
          Opens like an app and works offline.
        </span>
      </span>
      <Button
        size="sm"
        onClick={async () => {
          await deferred.prompt()
          await deferred.userChoice
          setDeferred(null)
        }}
      >
        <Download data-icon="inline-start" />
        Install
      </Button>
    </div>
  )
}
