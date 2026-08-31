"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useIsHydrated } from "@/hooks/use-hydrated"
import {
  removePushSubscription,
  savePushSubscription,
} from "@/server/actions/notification"

/// VAPID keys travel as base64url; the Push API wants raw bytes.
function toUint8Array(base64: string) {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export function PushToggle({ vapidPublicKey }: { vapidPublicKey?: string }) {
  const [enabled, setEnabled] = useState(false)
  const [pending, startTransition] = useTransition()
  const hydrated = useIsHydrated()

  const supported =
    hydrated &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    Boolean(vapidPublicKey)

  useEffect(() => {
    if (!supported) return
    // Reflect whatever this device already decided, so the switch matches the
    // browser's real permission state rather than a fresh default.
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setEnabled(Boolean(subscription)))
      .catch(() => setEnabled(false))
  }, [supported])

  const toggle = (next: boolean) => {
    startTransition(async () => {
      const registration = await navigator.serviceWorker.ready

      if (!next) {
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await removePushSubscription({ endpoint: subscription.endpoint })
          await subscription.unsubscribe()
        }
        setEnabled(false)
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        toast.error(
          "Notifications are blocked. Allow them in your browser settings to turn this on."
        )
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8Array(vapidPublicKey!),
      })

      const json = subscription.toJSON() as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }

      const result = await savePushSubscription({
        endpoint: json.endpoint,
        keys: json.keys,
      })

      if (!result.ok) {
        toast.error(result.error)
        await subscription.unsubscribe()
        return
      }

      setEnabled(true)
      toast.success("Push notifications are on for this device.")
    })
  }

  if (!supported) {
    return (
      <div className="rounded-xl border p-4">
        <p className="text-sm font-medium">Push notifications</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {/* iOS only exposes the Push API to installed web apps. */}
          Not available in this browser. On an iPhone, add Hisaab to your home
          screen first.
        </p>
      </div>
    )
  }

  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border p-4">
      <span className="space-y-1">
        <Label className="text-sm font-medium">Push notifications</Label>
        <span className="block text-xs text-muted-foreground">
          Get told when someone adds an expense you are part of, or records a
          payment to you.
        </span>
      </span>
      <Switch checked={enabled} onCheckedChange={toggle} disabled={pending} />
    </label>
  )
}
