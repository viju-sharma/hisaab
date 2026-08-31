"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"

import { ActionError, defineAction } from "@/lib/action"
import { requireGroupAdmin, requireGroupMember, requireGroupOwner } from "@/lib/authz"
import { publishEvent } from "@/lib/events"
import { newInviteCode, newInviteToken, normaliseInviteCode } from "@/lib/invite"
import { recordAudit } from "@/lib/observability/audit"
import { prisma } from "@/lib/prisma"
import { sendPushToUsers } from "@/lib/push"
import {
  changeRoleSchema,
  createGroupSchema,
  createInviteSchema,
  groupIdSchema,
  joinGroupSchema,
  memberSchema,
  updateGroupSchema,
} from "@/lib/validation"

export const createGroup = defineAction(
  "group.create",
  createGroupSchema,
  async (input, user) => {
    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.group.create({
        data: {
          name: input.name,
          description: input.description || null,
          type: input.type,
          emoji: input.emoji,
          colorKey: input.colorKey,
          currency: input.currency,
          simplifyDebts: input.simplifyDebts,
          createdById: user.id,
          members: { create: { userId: user.id, role: "OWNER" } },
          // Every group gets a shareable invite from the moment it exists, so
          // "create then share" is one step rather than two.
          inviteCodes: {
            create: {
              code: newInviteCode(),
              token: newInviteToken(),
              createdById: user.id,
            },
          },
        },
      })

      await recordAudit(tx, {
        action: "CREATE",
        entityType: "Group",
        entityId: created.id,
        groupId: created.id,
        after: created,
      })
      await publishEvent(tx, {
        groupId: created.id,
        actorId: user.id,
        type: "GROUP_CREATED",
        summary: `created ${created.name}`,
        entityType: "Group",
        entityId: created.id,
      })

      return created
    })

    revalidatePath("/groups")
    revalidatePath("/dashboard")
    return { groupId: group.id }
  }
)

export const updateGroup = defineAction(
  "group.update",
  updateGroupSchema,
  async ({ groupId, ...changes }, user) => {
    await requireGroupAdmin(groupId)

    await prisma.$transaction(async (tx) => {
      const before = await tx.group.findUniqueOrThrow({ where: { id: groupId } })
      const after_ = await tx.group.update({
        where: { id: groupId },
        data: {
          ...changes,
          description: changes.description === "" ? null : changes.description,
        },
      })

      await recordAudit(tx, {
        action: "UPDATE",
        entityType: "Group",
        entityId: groupId,
        groupId,
        before,
        after: after_,
      })
      await publishEvent(tx, {
        groupId,
        actorId: user.id,
        type: "GROUP_UPDATED",
        summary: `updated the group settings`,
        entityType: "Group",
        entityId: groupId,
      })
    })

    revalidatePath(`/groups/${groupId}`)
    return { groupId }
  }
)

export const archiveGroup = defineAction(
  "group.archive",
  groupIdSchema,
  async ({ groupId }, user) => {
    await requireGroupOwner(groupId)

    await prisma.$transaction(async (tx) => {
      const before = await tx.group.findUniqueOrThrow({ where: { id: groupId } })
      if (before.archivedAt) throw new ActionError("This group is already archived.")

      const updated = await tx.group.update({
        where: { id: groupId },
        data: { archivedAt: new Date() },
      })

      await recordAudit(tx, {
        action: "UPDATE",
        entityType: "Group",
        entityId: groupId,
        groupId,
        before,
        after: updated,
      })
      await publishEvent(tx, {
        groupId,
        actorId: user.id,
        type: "GROUP_ARCHIVED",
        summary: `archived the group`,
        entityType: "Group",
        entityId: groupId,
      })
    })

    revalidatePath("/groups")
    return { groupId }
  }
)

export const createInvite = defineAction(
  "invite.create",
  createInviteSchema,
  async ({ groupId, expiresInDays, maxUses }, user) => {
    await requireGroupAdmin(groupId)

    const invite = await prisma.$transaction(async (tx) => {
      // A fresh invite retires the old one, so a link shared with the wrong
      // person stops working the moment a new one is generated.
      await tx.inviteCode.updateMany({
        where: { groupId, revokedAt: null },
        data: { revokedAt: new Date() },
      })

      const created = await tx.inviteCode.create({
        data: {
          groupId,
          code: newInviteCode(),
          token: newInviteToken(),
          createdById: user.id,
          maxUses,
          expiresAt: expiresInDays
            ? new Date(Date.now() + expiresInDays * 86_400_000)
            : null,
        },
      })

      await recordAudit(tx, {
        action: "INVITE",
        entityType: "InviteCode",
        entityId: created.id,
        groupId,
        after: { code: created.code, expiresAt: created.expiresAt, maxUses },
      })
      return created
    })

    revalidatePath(`/groups/${groupId}`)
    return { code: invite.code, token: invite.token }
  }
)

export const joinGroup = defineAction(
  "group.join",
  joinGroupSchema,
  async ({ code }, user) => {
    const normalised = normaliseInviteCode(code)
    const raw = code.trim().split("/").pop() ?? code.trim()

    const invite = await prisma.inviteCode.findFirst({
      where: { OR: [{ token: raw }, { code: normalised }] },
      include: { group: { select: { id: true, name: true, deletedAt: true } } },
    })

    if (!invite || invite.group.deletedAt) {
      throw new ActionError("That invite code doesn't match any group.")
    }
    if (invite.revokedAt) {
      throw new ActionError("That invite has been revoked. Ask for a new one.")
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new ActionError("That invite has expired. Ask for a new one.")
    }
    if (invite.maxUses != null && invite.useCount >= invite.maxUses) {
      throw new ActionError("That invite has been used up. Ask for a new one.")
    }

    const groupId = invite.groupId

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    })
    if (existing && !existing.leftAt) {
      return { groupId, alreadyMember: true }
    }

    const recipients = await prisma.$transaction(async (tx) => {
      const membership = existing
        ? await tx.groupMember.update({
            where: { id: existing.id },
            data: { leftAt: null, joinedAt: new Date() },
          })
        : await tx.groupMember.create({
            data: { groupId, userId: user.id, role: "MEMBER" },
          })

      await tx.inviteCode.update({
        where: { id: invite.id },
        data: { useCount: { increment: 1 } },
      })

      await recordAudit(tx, {
        action: "JOIN",
        entityType: "GroupMember",
        entityId: membership.id,
        groupId,
        after: membership,
      })

      const members = await tx.groupMember.findMany({
        where: { groupId, leftAt: null },
        select: { userId: true },
      })

      return publishEvent(tx, {
        groupId,
        actorId: user.id,
        type: "MEMBER_JOINED",
        summary: `joined ${invite.group.name}`,
        entityType: "GroupMember",
        entityId: membership.id,
        notify: {
          userIds: members.map((member) => member.userId),
          title: `${user.name ?? "Someone"} joined ${invite.group.name}`,
          href: `/groups/${groupId}`,
        },
      })
    })

    after(() =>
      sendPushToUsers(recipients, {
        title: `${user.name ?? "Someone"} joined ${invite.group.name}`,
        href: `/groups/${groupId}`,
        tag: `group-${groupId}`,
      })
    )

    revalidatePath("/groups")
    return { groupId, alreadyMember: false }
  }
)

export const leaveGroup = defineAction(
  "group.leave",
  groupIdSchema,
  async ({ groupId }, user) => {
    const { membership } = await requireGroupMember(groupId)

    if (membership.role === "OWNER") {
      throw new ActionError(
        "Hand the group over to another member before leaving."
      )
    }

    // Leaving with an outstanding balance would strand the debt, so the ledger
    // has to be square first.
    const { netFor, netBalances } = await import("@/lib/balance")
    const ledger = await loadLedger(groupId)
    if (netFor(netBalances(ledger), user.id) !== 0) {
      throw new ActionError("Settle up before leaving this group.")
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.groupMember.update({
        where: { id: membership.id },
        data: { leftAt: new Date() },
      })
      await recordAudit(tx, {
        action: "LEAVE",
        entityType: "GroupMember",
        entityId: membership.id,
        groupId,
        before: membership,
        after: updated,
      })
      await publishEvent(tx, {
        groupId,
        actorId: user.id,
        type: "MEMBER_LEFT",
        summary: "left the group",
        entityType: "GroupMember",
        entityId: membership.id,
      })
    })

    revalidatePath("/groups")
    return { groupId }
  }
)

export const removeMember = defineAction(
  "group.removeMember",
  memberSchema,
  async ({ groupId, userId }, user) => {
    await requireGroupAdmin(groupId)
    if (userId === user.id) throw new ActionError("Use 'Leave group' instead.")

    const target = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    })
    if (!target || target.leftAt) throw new ActionError("They are not in this group.")
    if (target.role === "OWNER") throw new ActionError("The owner cannot be removed.")

    const { netFor, netBalances } = await import("@/lib/balance")
    const ledger = await loadLedger(groupId)
    if (netFor(netBalances(ledger), userId) !== 0) {
      throw new ActionError("Settle their balance before removing them.")
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.groupMember.update({
        where: { id: target.id },
        data: { leftAt: new Date() },
      })
      await recordAudit(tx, {
        action: "LEAVE",
        entityType: "GroupMember",
        entityId: target.id,
        groupId,
        before: target,
        after: updated,
      })
      await publishEvent(tx, {
        groupId,
        actorId: user.id,
        type: "MEMBER_LEFT",
        summary: "removed a member",
        entityType: "GroupMember",
        entityId: target.id,
      })
    })

    revalidatePath(`/groups/${groupId}`)
    return { groupId }
  }
)

export const changeMemberRole = defineAction(
  "group.changeRole",
  changeRoleSchema,
  async ({ groupId, userId, role }, user) => {
    await requireGroupOwner(groupId)
    if (userId === user.id) throw new ActionError("You cannot change your own role.")

    await prisma.$transaction(async (tx) => {
      const before = await tx.groupMember.findUniqueOrThrow({
        where: { groupId_userId: { groupId, userId } },
      })
      const updated = await tx.groupMember.update({
        where: { id: before.id },
        data: { role },
      })
      await recordAudit(tx, {
        action: "UPDATE",
        entityType: "GroupMember",
        entityId: before.id,
        groupId,
        before,
        after: updated,
      })
      await publishEvent(tx, {
        groupId,
        actorId: user.id,
        type: "MEMBER_ROLE_CHANGED",
        summary: `made a member ${role.toLowerCase()}`,
        entityType: "GroupMember",
        entityId: before.id,
      })
    })

    revalidatePath(`/groups/${groupId}`)
    return { groupId }
  }
)

/// Minimal ledger read used by the guards above. The full read path lives in
/// server/queries/balance.ts; this stays here to avoid a circular import.
async function loadLedger(groupId: string) {
  const [expenses, settlements] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId, deletedAt: null },
      select: {
        payers: { select: { userId: true, groupAmountMinor: true } },
        splits: { select: { userId: true, groupAmountMinor: true } },
      },
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
    settlements: settlements.map((entry) => ({
      fromUserId: entry.fromUserId,
      toUserId: entry.toUserId,
      amountMinor: entry.groupAmountMinor,
    })),
  }
}
