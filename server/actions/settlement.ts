"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"

import { ActionError, defineAction } from "@/lib/action"
import { requireGroupMember } from "@/lib/authz"
import { publishEvent } from "@/lib/events"
import { convertMinor, formatMoney } from "@/lib/money"
import { db } from "@/lib/db"
import { toExchangeRate } from "@/lib/db-decimal"
import { fromDate, now } from "@/lib/db-time"
import { newId } from "@/lib/id"
import { recordAudit } from "@/lib/observability/audit"
import { sendPushToUsers } from "@/lib/push"
import { settlementSchema } from "@/lib/validation"
import { z } from "zod"

export const recordSettlement = defineAction(
  "settlement.create",
  settlementSchema,
  async (input, user) => {
    await requireGroupMember(input.groupId)

    if (input.fromUserId === input.toUserId) {
      throw new ActionError("A payment needs two different people.")
    }

    const group = await db.orm.public.Group.where((entry) =>
      entry.id.eq(input.groupId)
    )
      .select("name", "currency")
      .first()
    if (!group) throw new ActionError("That group no longer exists.")

    const members = await db.orm.public.GroupMember.where((member) =>
      member.groupId.eq(input.groupId)
    )
      .where((member) => member.userId.in([input.fromUserId, input.toUserId]))
      .where((member) => member.leftAt.isNull())
      .select("userId")
      .all()
    if (members.length !== 2) {
      throw new ActionError("Both people need to be members of this group.")
    }

    const settlement = await db.transaction(async (tx) => {
      const timestamp = now()
      const created = await tx.orm.public.Settlement.create({
        id: newId(),
        groupId: input.groupId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        currency: input.currency,
        amountMinor: input.amountMinor,
        exchangeRate: toExchangeRate(input.exchangeRate),
        groupAmountMinor: convertMinor(
          input.amountMinor,
          input.currency,
          group.currency,
          input.exchangeRate
        ),
        method: input.method,
        date: fromDate(input.date),
        note: input.note || null,
        createdById: user.id,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      })

      await recordAudit(tx, {
        action: "SETTLE",
        entityType: "Settlement",
        entityId: created.id,
        groupId: input.groupId,
        after: created,
      })

      const amount = formatMoney(input.amountMinor, input.currency)
      await publishEvent(tx, {
        groupId: input.groupId,
        actorId: user.id,
        type: "SETTLEMENT_RECORDED",
        summary: `recorded a payment of ${amount}`,
        entityType: "Settlement",
        entityId: created.id,
        notify: {
          // Both sides of the payment hear about it, whoever logged it.
          userIds: [input.fromUserId, input.toUserId],
          title: `Payment of ${amount} recorded`,
          body: `In ${group.name}`,
          href: `/groups/${input.groupId}/balances`,
        },
      })

      return created
    })

    after(() =>
      sendPushToUsers(
        [input.fromUserId, input.toUserId].filter((id) => id !== user.id),
        {
          title: `Payment of ${formatMoney(input.amountMinor, input.currency)} recorded`,
          body: `In ${group.name}`,
          href: `/groups/${input.groupId}/balances`,
          tag: `settlement-${settlement.id}`,
        }
      )
    )

    revalidatePath(`/groups/${input.groupId}`)
    revalidatePath("/dashboard")
    return { settlementId: settlement.id }
  }
)

export const deleteSettlement = defineAction(
  "settlement.delete",
  z.object({ settlementId: z.string().min(1) }),
  async ({ settlementId }, user) => {
    const settlement = await db.orm.public.Settlement.where((entry) =>
      entry.id.eq(settlementId)
    ).first()
    if (!settlement) throw new ActionError("That payment no longer exists.")
    await requireGroupMember(settlement.groupId)
    if (settlement.deletedAt)
      throw new ActionError("That payment is already deleted.")

    await db.transaction(async (tx) => {
      const timestamp = now()
      const updated = await tx.orm.public.Settlement.where((entry) =>
        entry.id.eq(settlementId)
      ).update({ deletedAt: timestamp, updatedAt: timestamp })
      await recordAudit(tx, {
        action: "DELETE",
        entityType: "Settlement",
        entityId: settlementId,
        groupId: settlement.groupId,
        before: settlement,
        after: updated,
      })
      await publishEvent(tx, {
        groupId: settlement.groupId,
        actorId: user.id,
        type: "SETTLEMENT_DELETED",
        summary: "deleted a payment",
        entityType: "Settlement",
        entityId: settlementId,
        notify: {
          userIds: [settlement.fromUserId, settlement.toUserId],
          title: "A recorded payment was deleted",
          href: `/groups/${settlement.groupId}/balances`,
        },
      })
    })

    revalidatePath(`/groups/${settlement.groupId}`)
    revalidatePath("/dashboard")
    return { groupId: settlement.groupId }
  }
)
