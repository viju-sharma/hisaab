"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ActionError, defineAction } from "@/lib/action"
import { requireGroupMember } from "@/lib/authz"
import { publishEvent } from "@/lib/events"
import { recordAudit } from "@/lib/observability/audit"
import { prisma } from "@/lib/prisma"
import { describeRecurrence, nextOccurrence } from "@/lib/recurrence"
import { recurringSchema } from "@/lib/validation"

const recurringIdSchema = z.object({ recurringId: z.string().min(1) })

export const createRecurring = defineAction(
  "recurring.create",
  recurringSchema,
  async (input, user) => {
    await requireGroupMember(input.groupId)

    const rule = {
      frequency: input.frequency,
      interval: input.interval,
      anchorDay: input.anchorDay,
      weekday: input.weekday,
      endDate: input.endDate,
    }
    // Anchor one day before the start so the start date itself can be the first
    // occurrence rather than being skipped.
    const firstRun = nextOccurrence(
      rule,
      new Date(input.startDate.getTime() - 86_400_000)
    )
    if (!firstRun) {
      throw new ActionError("That schedule never comes round. Check the dates.")
    }

    const recurring = await prisma.$transaction(async (tx) => {
      const created = await tx.recurringExpense.create({
        data: {
          groupId: input.groupId,
          description: input.description,
          notes: input.notes || null,
          categoryId: input.categoryId,
          currency: input.currency,
          amountMinor: input.amountMinor,
          splitMethod: input.split.method,
          payerConfig: input.payers,
          splitConfig: input.split,
          frequency: input.frequency,
          interval: input.interval,
          anchorDay: input.anchorDay,
          weekday: input.weekday,
          startDate: input.startDate,
          endDate: input.endDate,
          nextRunAt: firstRun,
          createdById: user.id,
        },
      })

      await recordAudit(tx, {
        action: "CREATE",
        entityType: "RecurringExpense",
        entityId: created.id,
        groupId: input.groupId,
        after: created,
      })
      await publishEvent(tx, {
        groupId: input.groupId,
        actorId: user.id,
        type: "RECURRING_CREATED",
        summary: `set up ${input.description} ${describeRecurrence(rule)}`,
        entityType: "RecurringExpense",
        entityId: created.id,
      })

      return created
    })

    revalidatePath(`/groups/${input.groupId}/recurring`)
    return { recurringId: recurring.id }
  }
)

export const toggleRecurring = defineAction(
  "recurring.toggle",
  recurringIdSchema,
  async ({ recurringId }, user) => {
    const recurring = await prisma.recurringExpense.findUniqueOrThrow({
      where: { id: recurringId },
    })
    await requireGroupMember(recurring.groupId)
    if (recurring.deletedAt) throw new ActionError("That schedule was deleted.")

    await prisma.$transaction(async (tx) => {
      const updated = await tx.recurringExpense.update({
        where: { id: recurringId },
        data: { isPaused: !recurring.isPaused },
      })
      await recordAudit(tx, {
        action: "UPDATE",
        entityType: "RecurringExpense",
        entityId: recurringId,
        groupId: recurring.groupId,
        before: recurring,
        after: updated,
      })
      await publishEvent(tx, {
        groupId: recurring.groupId,
        actorId: user.id,
        type: "RECURRING_UPDATED",
        summary: `${updated.isPaused ? "paused" : "resumed"} ${recurring.description}`,
        entityType: "RecurringExpense",
        entityId: recurringId,
      })
    })

    revalidatePath(`/groups/${recurring.groupId}/recurring`)
    return { recurringId, paused: !recurring.isPaused }
  }
)

export const deleteRecurring = defineAction(
  "recurring.delete",
  recurringIdSchema,
  async ({ recurringId }, user) => {
    const recurring = await prisma.recurringExpense.findUniqueOrThrow({
      where: { id: recurringId },
    })
    await requireGroupMember(recurring.groupId)

    await prisma.$transaction(async (tx) => {
      const updated = await tx.recurringExpense.update({
        where: { id: recurringId },
        data: { deletedAt: new Date(), isPaused: true },
      })
      await recordAudit(tx, {
        action: "DELETE",
        entityType: "RecurringExpense",
        entityId: recurringId,
        groupId: recurring.groupId,
        before: recurring,
        after: updated,
      })
      await publishEvent(tx, {
        groupId: recurring.groupId,
        actorId: user.id,
        type: "RECURRING_UPDATED",
        summary: `removed the schedule for ${recurring.description}`,
        entityType: "RecurringExpense",
        entityId: recurringId,
      })
    })

    revalidatePath(`/groups/${recurring.groupId}/recurring`)
    return { groupId: recurring.groupId }
  }
)
