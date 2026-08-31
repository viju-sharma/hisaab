import { verifyWebhook } from "@clerk/nextjs/webhooks"
import type { NextRequest } from "next/server"

import { db } from "@/lib/db"
import { now } from "@/lib/db-time"
import { newId } from "@/lib/id"
import { log } from "@/lib/observability/logger"
import { withBackgroundContext } from "@/lib/observability/request"

/// Keeps our User rows in step with Clerk. `getOrCreateUser()` covers the gap
/// when a webhook is late, so this handler's job is updates and deletions more
/// than creation.
export async function POST(request: NextRequest) {
  return withBackgroundContext("webhook:clerk", async () => {
    let event
    try {
      // verifyWebhook reads the raw body itself — do not parse it first.
      event = await verifyWebhook(request)
    } catch (error) {
      log.warn("webhook.clerk.invalid", { error })
      return new Response("Invalid signature", { status: 400 })
    }

    log.info("webhook.clerk.received", { type: event.type })

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const data = event.data
        const email =
          data.email_addresses.find(
            (address) => address.id === data.primary_email_address_id
          )?.email_address ?? data.email_addresses[0]?.email_address

        if (!email) {
          log.warn("webhook.clerk.noEmail", { clerkId: data.id })
          break
        }

        const name =
          [data.first_name, data.last_name].filter(Boolean).join(" ") ||
          data.username ||
          null

        const timestamp = now()
        await db.orm.public.User.where({ clerkId: data.id }).upsert({
          create: {
            id: newId(),
            clerkId: data.id,
            email,
            name,
            imageUrl: data.image_url,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          update: {
            email,
            name,
            imageUrl: data.image_url,
            updatedAt: timestamp,
          },
        })
        break
      }

      case "user.deleted": {
        if (!event.data.id) break
        // Soft delete only: their name still appears on every expense they were
        // part of, and the ledger has to stay readable.
        const timestamp = now()
        await db.orm.public.User.where((user) =>
          user.clerkId.eq(event.data.id!)
        ).updateAll({ deletedAt: timestamp, updatedAt: timestamp })
        break
      }

      default:
        break
    }

    return Response.json({ received: true })
  })
}
