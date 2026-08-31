import type { DbTransaction } from "@/lib/db"
import type { EventType, JsonValue } from "@/lib/db-types"
import { newId } from "@/lib/id"
import { log } from "@/lib/observability/logger"

export type PublishEventInput = {
  groupId?: string | null
  actorId: string
  type: EventType
  /// Feed line, written at publish time so history stays readable even after
  /// the underlying rows are edited or soft-deleted.
  summary: string
  entityType?: string
  entityId?: string
  data?: Record<string, JsonValue>
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
  tx: DbTransaction,
  input: PublishEventInput
): Promise<string[]> {
  await tx.orm.public.Activity.create({
    id: newId(),
    groupId: input.groupId ?? null,
    actorId: input.actorId,
    type: input.type,
    summary: input.summary,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    data: input.data ?? null,
  })

  if (!input.notify) return []

  const notify = input.notify
  const recipients = [...new Set(notify.userIds)].filter(
    (userId) => userId !== input.actorId
  )
  if (recipients.length === 0) return []

  await tx.orm.public.Notification.createAll(
    recipients.map((userId) => ({
      id: newId(),
      userId,
      groupId: input.groupId ?? null,
      type: input.type,
      title: notify.title,
      body: notify.body ?? null,
      href: notify.href ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      data: input.data ?? null,
      readAt: null,
    }))
  )

  log.info("event.published", {
    type: input.type,
    recipients: recipients.length,
  })

  return recipients
}
