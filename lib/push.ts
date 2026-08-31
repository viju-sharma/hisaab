import "server-only"

import webpush from "web-push"

import { db } from "@/lib/db"
import { log } from "@/lib/observability/logger"

export type PushPayload = {
  title: string
  body?: string
  href?: string
  tag?: string
}

let configured = false

function configure(): boolean {
  if (configured) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:hello@hisaab.app",
    publicKey,
    privateKey
  )
  configured = true
  return true
}

/// Fire-and-forget delivery, called from `after()` so a slow push service never
/// holds up the response. Endpoints the push service has permanently rejected
/// are deleted rather than retried forever.
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0) return
  if (!configure()) {
    log.debug("push.skipped", { reason: "VAPID keys not configured" })
    return
  }

  const subscriptions = await db.orm.public.PushSubscription.where(
    (subscription) => subscription.userId.in(userIds)
  )
    .select("id", "endpoint", "p256dh", "auth")
    .all()
  if (subscriptions.length === 0) return

  const body = JSON.stringify(payload)
  const expired: string[] = []

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body
        )
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        // 404/410 mean the browser dropped the subscription for good.
        if (status === 404 || status === 410) expired.push(subscription.id)
        else
          log.warn("push.failed", { status, subscriptionId: subscription.id })
      }
    })
  )

  if (expired.length > 0) {
    await db.orm.public.PushSubscription.where((subscription) =>
      subscription.id.in(expired)
    ).deleteAndCount()
    log.info("push.pruned", { count: expired.length })
  }

  log.info("push.sent", {
    recipients: userIds.length,
    endpoints: subscriptions.length - expired.length,
  })
}
