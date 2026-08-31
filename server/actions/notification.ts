"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { defineAction } from "@/lib/action"
import { prisma } from "@/lib/prisma"
import { pushSubscriptionSchema } from "@/lib/validation"

export const markNotificationRead = defineAction(
  "notification.read",
  z.object({ notificationId: z.string().min(1) }),
  async ({ notificationId }, user) => {
    // Scoped by userId as well as id, so a guessed id reveals nothing.
    await prisma.notification.updateMany({
      where: { id: notificationId, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    })
    revalidatePath("/notifications")
    return { notificationId }
  }
)

export const markAllNotificationsRead = defineAction(
  "notification.readAll",
  z.object({}),
  async (_input, user) => {
    const { count } = await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    })
    revalidatePath("/notifications")
    return { count }
  }
)

export const savePushSubscription = defineAction(
  "push.subscribe",
  pushSubscriptionSchema,
  async (input, user) => {
    await prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      update: {
        userId: user.id,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        lastSeenAt: new Date(),
        failureCount: 0,
      },
      create: {
        userId: user.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
      },
    })
    return { subscribed: true }
  }
)

export const removePushSubscription = defineAction(
  "push.unsubscribe",
  z.object({ endpoint: z.string().url() }),
  async ({ endpoint }, user) => {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: user.id },
    })
    return { subscribed: false }
  }
)
