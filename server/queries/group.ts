import "server-only"

import { getOrCreateUser } from "@/lib/auth"
import { requireGroupMember } from "@/lib/authz"
import { netBalances, netFor, type GroupLedger } from "@/lib/balance"
import { db } from "@/lib/db"
import { toDateOrNull } from "@/lib/db-time"

export type MemberSummary = {
  userId: string
  name: string
  email: string
  imageUrl: string | null
  role: "OWNER" | "ADMIN" | "MEMBER"
  nickname: string | null
}

/// Selects deliberately exclude the Numeric columns: no read path needs the raw
/// exchange rate, and the group-currency figures are already denormalised.
export async function loadGroupLedger(groupId: string): Promise<GroupLedger> {
  const [expenses, settlements] = await Promise.all([
    db.orm.public.Expense.where((expense) => expense.groupId.eq(groupId))
      .where((expense) => expense.deletedAt.isNull())
      .select("id")
      .include("payers", (payer) => payer.select("userId", "groupAmountMinor"))
      .include("splits", (split) => split.select("userId", "groupAmountMinor"))
      .all(),
    db.orm.public.Settlement.where((settlement) =>
      settlement.groupId.eq(groupId)
    )
      .where((settlement) => settlement.deletedAt.isNull())
      .select("fromUserId", "toUserId", "groupAmountMinor")
      .all(),
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

/// The viewer's groups. Membership is resolved first and the groups are then
/// read by id: the ORM has no predicate or ordering across a to-one relation,
/// so `deletedAt` and the recency sort both belong on the Group query.
export async function listGroupsForUser() {
  const user = await getOrCreateUser()

  const memberships = await db.orm.public.GroupMember.where((member) =>
    member.userId.eq(user.id)
  )
    .where((member) => member.leftAt.isNull())
    .select("groupId")
    .all()

  const groupIds = memberships.map((membership) => membership.groupId)
  if (groupIds.length === 0) return []

  const groups = await db.orm.public.Group.where((group) =>
    group.id.in(groupIds)
  )
    .where((group) => group.deletedAt.isNull())
    .select("id", "name", "emoji", "colorKey", "type", "currency", "archivedAt")
    .include("members", (member) =>
      member
        .where((entry) => entry.leftAt.isNull())
        .select("userId")
        .include("user", (person) => person.select("name", "imageUrl"))
    )
    .include("expenses", (expense) =>
      expense.where((entry) => entry.deletedAt.isNull()).count()
    )
    .orderBy((group) => group.updatedAt.desc())
    .all()

  // One ledger read per group rather than a single join: the balance maths is
  // pure and the group counts here are small.
  return Promise.all(
    groups.map(async (group) => {
      const ledger = await loadGroupLedger(group.id)
      return {
        id: group.id,
        name: group.name,
        emoji: group.emoji,
        colorKey: group.colorKey,
        type: group.type,
        currency: group.currency,
        archivedAt: toDateOrNull(group.archivedAt),
        expenseCount: group.expenses,
        members: group.members.map((member) => ({
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

  const group = await db.orm.public.Group.where((entry) => entry.id.eq(groupId))
    .select(
      "id",
      "name",
      "description",
      "emoji",
      "colorKey",
      "type",
      "currency",
      "simplifyDebts",
      "archivedAt"
    )
    .include("members", (member) =>
      member
        .where((entry) => entry.leftAt.isNull())
        .orderBy((entry) => entry.joinedAt.asc())
        .select("userId", "role", "nickname")
        .include("user", (person) => person.select("name", "email", "imageUrl"))
    )
    .include("inviteCodes", (invite) =>
      invite
        .where((entry) => entry.revokedAt.isNull())
        .orderBy((entry) => entry.createdAt.desc())
        .limit(1)
        .select("code", "token", "expiresAt", "maxUses")
    )
    .first()

  // requireGroupMember already proved the row exists and the viewer belongs to
  // it, so a miss here is a race with a hard delete, not an access decision.
  if (!group) throw new Error(`Group ${groupId} disappeared mid-read.`)

  const members: MemberSummary[] = group.members.map((member) => ({
    userId: member.userId,
    name: member.nickname ?? member.user.name ?? member.user.email,
    email: member.user.email,
    imageUrl: member.user.imageUrl,
    role: member.role,
    nickname: member.nickname,
  }))

  const invite = group.inviteCodes[0]

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    emoji: group.emoji,
    colorKey: group.colorKey,
    type: group.type,
    currency: group.currency,
    simplifyDebts: group.simplifyDebts,
    archivedAt: toDateOrNull(group.archivedAt),
    members,
    invite: invite
      ? {
          code: invite.code,
          token: invite.token,
          expiresAt: toDateOrNull(invite.expiresAt),
          maxUses: invite.maxUses,
        }
      : null,
    viewer: { userId: user.id, role: membership.role },
  }
}
