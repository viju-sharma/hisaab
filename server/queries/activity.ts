import "server-only"

import { getOrCreateUser } from "@/lib/auth"
import { requireGroupMember } from "@/lib/authz"
import { db } from "@/lib/db"
import { toDate, toDateOrNull } from "@/lib/db-time"

export async function listGroupActivity(groupId: string, take = 50) {
  await requireGroupMember(groupId)

  const rows = await db.orm.public.Activity.where((activity) =>
    activity.groupId.eq(groupId)
  )
    .select("id", "type", "summary", "entityType", "entityId", "createdAt")
    .include("actor", (actor) => actor.select("id", "name", "imageUrl"))
    .orderBy((activity) => activity.createdAt.desc())
    .limit(take)
    .all()

  return rows.map((row) => ({ ...row, createdAt: toDate(row.createdAt) }))
}

/// The personal feed spans every group the viewer is currently in — scoped by
/// membership rather than by actor, so it shows what happened *to* them too.
export async function listPersonalActivity(take = 50) {
  const user = await getOrCreateUser()

  const memberships = await db.orm.public.GroupMember.where((member) =>
    member.userId.eq(user.id)
  )
    .where((member) => member.leftAt.isNull())
    .select("groupId")
    .all()

  const groupIds = memberships.map((membership) => membership.groupId)
  if (groupIds.length === 0) return []

  const rows = await db.orm.public.Activity.where((activity) =>
    activity.groupId.in(groupIds)
  )
    .select(
      "id",
      "type",
      "summary",
      "entityType",
      "entityId",
      "createdAt",
      "groupId"
    )
    .include("group", (group) => group.select("name", "emoji"))
    .include("actor", (actor) => actor.select("id", "name", "imageUrl"))
    .orderBy((activity) => activity.createdAt.desc())
    .limit(take)
    .all()

  return rows.map((row) => ({ ...row, createdAt: toDate(row.createdAt) }))
}

export async function listNotifications(take = 50) {
  const user = await getOrCreateUser()

  const [notifications, unread] = await Promise.all([
    db.orm.public.Notification.where((notification) =>
      notification.userId.eq(user.id)
    )
      .select("id", "type", "title", "body", "href", "readAt", "createdAt")
      .orderBy((notification) => notification.createdAt.desc())
      .limit(take)
      .all(),
    db.orm.public.Notification.where((notification) =>
      notification.userId.eq(user.id)
    )
      .where((notification) => notification.readAt.isNull())
      .aggregate((aggregate) => ({ count: aggregate.count() })),
  ])

  return {
    notifications: notifications.map((notification) => ({
      ...notification,
      readAt: toDateOrNull(notification.readAt),
      createdAt: toDate(notification.createdAt),
    })),
    unreadCount: unread.count,
  }
}

export async function countUnreadNotifications() {
  const user = await getOrCreateUser()
  const { count } = await db.orm.public.Notification.where((notification) =>
    notification.userId.eq(user.id)
  )
    .where((notification) => notification.readAt.isNull())
    .aggregate((aggregate) => ({ count: aggregate.count() }))
  return count
}
