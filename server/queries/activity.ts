import "server-only"

import { getOrCreateUser } from "@/lib/auth"
import { requireGroupMember } from "@/lib/authz"
import { prisma } from "@/lib/prisma"

export async function listGroupActivity(groupId: string, take = 50) {
  await requireGroupMember(groupId)

  return prisma.activity.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      summary: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      actor: { select: { id: true, name: true, imageUrl: true } },
    },
  })
}

/// The personal feed spans every group the viewer is currently in — scoped by
/// membership rather than by actor, so it shows what happened *to* them too.
export async function listPersonalActivity(take = 50) {
  const user = await getOrCreateUser()

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id, leftAt: null },
    select: { groupId: true },
  })

  return prisma.activity.findMany({
    where: { groupId: { in: memberships.map((m) => m.groupId) } },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      summary: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      groupId: true,
      group: { select: { name: true, emoji: true } },
      actor: { select: { id: true, name: true, imageUrl: true } },
    },
  })
}

export async function listNotifications(take = 50) {
  const user = await getOrCreateUser()

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        href: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ])

  return { notifications, unreadCount }
}

export async function countUnreadNotifications() {
  const user = await getOrCreateUser()
  return prisma.notification.count({ where: { userId: user.id, readAt: null } })
}
