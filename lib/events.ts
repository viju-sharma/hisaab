import type { EventType } from "@/app/generated/prisma/enums"
import { log } from "@/lib/observability/logger"
import type { PrismaTransaction } from "@/lib/prisma"

export type PublishEventInput = {
  groupId?: string | null
  actorId: string
  type: EventType
  /// Feed line, written at publish time so history stays readable even after
  /// the underlying rows are edited or soft-deleted.
  summary: string
  entityType?: string
  entityId?: string
  data?: Record<string, unknown>
  notify?: {
    /// The actor is filtered out automatically — nobody needs telling about
    /// their own action.
    userIds: string[]
    title: string
    body?: string
    href?: string
  }
}

/// One domain event becomes one Activity row for the feed and one Notification
/// per recipient. Called inside the mutating transaction so a member can never
/// see a notification for a change that was rolled back.
export async function publishEvent(
  tx: PrismaTransaction,
  input: PublishEventInput
): Promise<string[]> {
  await tx.activity.create({
    data: {
      groupId: input.groupId ?? undefined,
      actorId: input.actorId,
      type: input.type,
      summary: input.summary,
      entityType: input.entityType,
      entityId: input.entityId,
      data: input.data as object | undefined,
    },
  })

  if (!input.notify) return []

  const recipients = [...new Set(input.notify.userIds)].filter(
    (userId) => userId !== input.actorId
  )
  if (recipients.length === 0) return []

  await tx.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      groupId: input.groupId ?? undefined,
      type: input.type,
      title: input.notify!.title,
      body: input.notify!.body,
      href: input.notify!.href,
      entityType: input.entityType,
      entityId: input.entityId,
      data: input.data as object | undefined,
    })),
  })

  log.info("event.published", {
    type: input.type,
    recipients: recipients.length,
  })

  return recipients
}
