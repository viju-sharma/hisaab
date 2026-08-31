"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { defineAction } from "@/lib/action"
import { db } from "@/lib/db"
import { now } from "@/lib/db-time"
import { newId } from "@/lib/id"
import { pushSubscriptionSchema } from "@/lib/validation"

export const markNotificationRead = defineAction(
  "notification.read",
  z.object({ notificationId: z.string().min(1) }),
  async ({ notificationId }, user) => {
    // Scoped by userId as well as id, so a guessed id reveals nothing.
    await db.orm.public.Notification.where((notification) =>
      notification.id.eq(notificationId)
    )
      .where((notification) => notification.userId.eq(user.id))
      .where((notification) => notification.readAt.isNull())
      .updateAll({ readAt: now() })
    revalidatePath("/notifications")
    return { notificationId }
  }
)

export const markAllNotificationsRead = defineAction(
  "notification.readAll",
  z.object({}),
  async (_input, user) => {
    const count = await db.orm.public.Notification.where((notification) =>
      notification.userId.eq(user.id)
    )
      .where((notification) => notification.readAt.isNull())
      .updateAndCount({ readAt: now() })
    revalidatePath("/notifications")
    return { count }
  }
)

export const savePushSubscription = defineAction(
  "push.subscribe",
  pushSubscriptionSchema,
  async (input, user) => {
    const timestamp = now()
    await db.orm.public.PushSubscription.where({
      endpoint: input.endpoint,
    }).upsert({
      create: {
        id: newId(),
        userId: user.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: null,
        failureCount: 0,
        createdAt: timestamp,
        lastSeenAt: timestamp,
      },
      update: {
        userId: user.id,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        lastSeenAt: timestamp,
        failureCount: 0,
      },
    })
    return { subscribed: true }
  }
)

export const removePushSubscription = defineAction(
  "push.unsubscribe",
  z.object({ endpoint: z.string().url() }),
  async ({ endpoint }, user) => {
    await db.orm.public.PushSubscription.where((subscription) =>
      subscription.endpoint.eq(endpoint)
    )
      .where((subscription) => subscription.userId.eq(user.id))
      .deleteAndCount()
    return { subscribed: false }
  }
)
