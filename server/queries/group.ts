import "server-only"

import { getOrCreateUser } from "@/lib/auth"
import { requireGroupMember } from "@/lib/authz"
import { netBalances, netFor, type GroupLedger } from "@/lib/balance"
import { prisma } from "@/lib/prisma"

export type MemberSummary = {
  userId: string
  name: string
  email: string
  imageUrl: string | null
  role: "OWNER" | "ADMIN" | "MEMBER"
  nickname: string | null
}

/// Selects deliberately exclude Decimal columns: they do not serialise across
/// the server/client boundary, and no read path needs the raw rate.
const LEDGER_SELECT = {
  payers: { select: { userId: true, groupAmountMinor: true } },
  splits: { select: { userId: true, groupAmountMinor: true } },
} as const

export async function loadGroupLedger(groupId: string): Promise<GroupLedger> {
  const [expenses, settlements] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId, deletedAt: null },
      select: LEDGER_SELECT,
    }),
    prisma.settlement.findMany({
      where: { groupId, deletedAt: null },
      select: { fromUserId: true, toUserId: true, groupAmountMinor: true },
    }),
  ])

  return {
    expenses: expenses.map((expense) => ({
      payers: expense.payers.map((payer) => ({
        userId: payer.userId,
        amountMinor: payer.groupAmountMinor,
      })),
      splits: expense.splits.map((split) => ({
        userId: split.userId,
        amountMinor: split.groupAmountMinor,
      })),
    })),
    settlements: settlements.map((settlement) => ({
      fromUserId: settlement.fromUserId,
      toUserId: settlement.toUserId,
      amountMinor: settlement.groupAmountMinor,
    })),
  }
}

export async function listGroupsForUser() {
  const user = await getOrCreateUser()

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id, leftAt: null, group: { deletedAt: null } },
    include: {
      group: {
        include: {
          members: {
            where: { leftAt: null },
            select: {
              userId: true,
              user: { select: { name: true, imageUrl: true } },
            },
          },
          _count: { select: { expenses: { where: { deletedAt: null } } } },
        },
      },
    },
    orderBy: { group: { updatedAt: "desc" } },
  })

  // One ledger read per group rather than a single join: the balance maths is
  // pure and the group counts here are small.
  return Promise.all(
    memberships.map(async (membership) => {
      const ledger = await loadGroupLedger(membership.groupId)
      return {
        id: membership.group.id,
        name: membership.group.name,
        emoji: membership.group.emoji,
        colorKey: membership.group.colorKey,
        type: membership.group.type,
        currency: membership.group.currency,
        archivedAt: membership.group.archivedAt,
        expenseCount: membership.group._count.expenses,
        members: membership.group.members.map((member) => ({
          userId: member.userId,
          name: member.user.name ?? "Someone",
          imageUrl: member.user.imageUrl,
        })),
        myNetMinor: netFor(netBalances(ledger), user.id),
      }
    })
  )
}

export async function getGroupDetail(groupId: string) {
  const { user, membership } = await requireGroupMember(groupId)

  const group = await prisma.group.findUniqueOrThrow({
    where: { id: groupId },
    include: {
      members: {
        where: { leftAt: null },
        orderBy: { joinedAt: "asc" },
        select: {
          userId: true,
          role: true,
          nickname: true,
          user: {
            select: { name: true, email: true, imageUrl: true },
          },
        },
      },
      inviteCodes: {
        where: { revokedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { code: true, token: true, expiresAt: true, maxUses: true },
      },
    },
  })

  const members: MemberSummary[] = group.members.map((member) => ({
    userId: member.userId,
    name: member.nickname ?? member.user.name ?? member.user.email,
    email: member.user.email,
    imageUrl: member.user.imageUrl,
    role: member.role,
    nickname: member.nickname,
  }))

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    emoji: group.emoji,
    colorKey: group.colorKey,
    type: group.type,
    currency: group.currency,
    simplifyDebts: group.simplifyDebts,
    archivedAt: group.archivedAt,
    members,
    invite: group.inviteCodes[0] ?? null,
    viewer: { userId: user.id, role: membership.role },
  }
}
