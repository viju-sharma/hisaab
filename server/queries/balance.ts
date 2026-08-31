import "server-only"

import { getOrCreateUser } from "@/lib/auth"
import { requireGroupMember } from "@/lib/authz"
import { netBalances, pairwiseBalances, simplifyDebts } from "@/lib/balance"
import { db } from "@/lib/db"
import { toDateOrNull } from "@/lib/db-time"

import { loadGroupLedger } from "./group"

export async function getGroupBalances(groupId: string) {
  const { user } = await requireGroupMember(groupId)

  const [group, members, ledger] = await Promise.all([
    db.orm.public.Group.where((group) => group.id.eq(groupId))
      .select("currency", "simplifyDebts", "name")
      .first(),
    db.orm.public.GroupMember.where((member) => member.groupId.eq(groupId))
      .where((member) => member.leftAt.isNull())
      .select("userId", "nickname")
      .include("user", (person) => person.select("name", "email", "imageUrl"))
      .all(),
    loadGroupLedger(groupId),
  ])

  // requireGroupMember already proved the row exists.
  if (!group) throw new Error(`Group ${groupId} disappeared mid-read.`)

  const nameOf = new Map(
    members.map((member) => [
      member.userId,
      member.nickname ?? member.user.name ?? member.user.email,
    ])
  )
  const avatarOf = new Map(
    members.map((member) => [member.userId, member.user.imageUrl])
  )

  const nets = netBalances(ledger)
  // Both views are computed: simplified for settling up, pairwise for "why do I
  // owe this?". The group's preference only decides which one leads.
  const simplified = simplifyDebts(nets)
  const pairwise = pairwiseBalances(ledger)

  const decorate = (transfers: typeof simplified) =>
    transfers.map((transfer) => ({
      ...transfer,
      fromName: nameOf.get(transfer.fromUserId) ?? "Someone",
      toName: nameOf.get(transfer.toUserId) ?? "Someone",
      fromImageUrl: avatarOf.get(transfer.fromUserId) ?? null,
      toImageUrl: avatarOf.get(transfer.toUserId) ?? null,
    }))

  return {
    currency: group.currency,
    groupName: group.name,
    simplifyDebts: group.simplifyDebts,
    viewerId: user.id,
    balances: nets.map((entry) => ({
      ...entry,
      name: nameOf.get(entry.userId) ?? "Someone",
      imageUrl: avatarOf.get(entry.userId) ?? null,
    })),
    simplified: decorate(simplified),
    pairwise: decorate(pairwise),
  }
}

/// The home screen: one signed number per group, plus the totals across all of
/// them. Balances in different currencies are kept apart rather than summed.
export async function getDashboard() {
  const user = await getOrCreateUser()

  const memberships = await db.orm.public.GroupMember.where((member) =>
    member.userId.eq(user.id)
  )
    .where((member) => member.leftAt.isNull())
    .select("groupId")
    .all()

  const groupIds = memberships.map((membership) => membership.groupId)

  // The ORM has no predicate across a to-one relation, so `deletedAt` is
  // applied on the Group query rather than through the membership.
  const rows = groupIds.length
    ? await db.orm.public.Group.where((group) => group.id.in(groupIds))
        .where((group) => group.deletedAt.isNull())
        .select("id", "name", "emoji", "colorKey", "currency", "archivedAt")
        .all()
    : []

  const groups = await Promise.all(
    rows.map(async (group) => {
      const ledger = await loadGroupLedger(group.id)
      const net =
        netBalances(ledger).find((entry) => entry.userId === user.id)
          ?.netMinor ?? 0
      return {
        ...group,
        archivedAt: toDateOrNull(group.archivedAt),
        netMinor: net,
      }
    })
  )

  const totals = new Map<string, { owedToMe: number; iOwe: number }>()
  for (const group of groups) {
    if (group.archivedAt) continue
    const bucket = totals.get(group.currency) ?? { owedToMe: 0, iOwe: 0 }
    if (group.netMinor > 0) bucket.owedToMe += group.netMinor
    else bucket.iOwe += -group.netMinor
    totals.set(group.currency, bucket)
  }

  return {
    viewerId: user.id,
    viewerName: user.name,
    groups: groups.sort((a, b) => Math.abs(b.netMinor) - Math.abs(a.netMinor)),
    totals: [...totals.entries()].map(([currency, bucket]) => ({
      currency,
      ...bucket,
      netMinor: bucket.owedToMe - bucket.iOwe,
    })),
  }
}
