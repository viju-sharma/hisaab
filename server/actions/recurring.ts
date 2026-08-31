"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ActionError, defineAction } from "@/lib/action"
import { requireGroupMember } from "@/lib/authz"
import { publishEvent } from "@/lib/events"
import { db } from "@/lib/db"
import type { JsonValue } from "@/lib/db-types"
import { fromDate, fromDateOrNull, now } from "@/lib/db-time"
import { newId } from "@/lib/id"
import { recordAudit } from "@/lib/observability/audit"
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

    const recurring = await db.transaction(async (tx) => {
      const timestamp = now()
      const created = await tx.orm.public.RecurringExpense.create({
        id: newId(),
        groupId: input.groupId,
        description: input.description,
        notes: input.notes || null,
        categoryId: input.categoryId,
        currency: input.currency,
        amountMinor: input.amountMinor,
        splitMethod: input.split.method,
        payerConfig: input.payers as unknown as JsonValue,
        splitConfig: input.split as unknown as JsonValue,
        frequency: input.frequency,
        interval: input.interval,
        anchorDay: input.anchorDay,
        weekday: input.weekday,
        startDate: fromDate(input.startDate),
        endDate: fromDateOrNull(input.endDate),
        nextRunAt: fromDate(firstRun),
        lastRunAt: null,
        isPaused: false,
        createdById: user.id,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
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
    const recurring = await db.orm.public.RecurringExpense.where((entry) =>
      entry.id.eq(recurringId)
    ).first()
    if (!recurring) throw new ActionError("That schedule no longer exists.")
    await requireGroupMember(recurring.groupId)
    if (recurring.deletedAt) throw new ActionError("That schedule was deleted.")

    await db.transaction(async (tx) => {
      const updated = await tx.orm.public.RecurringExpense.where((entry) =>
        entry.id.eq(recurringId)
      ).update({ isPaused: !recurring.isPaused, updatedAt: now() })
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
        summary: `${updated?.isPaused ? "paused" : "resumed"} ${recurring.description}`,
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
    const recurring = await db.orm.public.RecurringExpense.where((entry) =>
      entry.id.eq(recurringId)
    ).first()
    if (!recurring) throw new ActionError("That schedule no longer exists.")
    await requireGroupMember(recurring.groupId)

    await db.transaction(async (tx) => {
      const timestamp = now()
      const updated = await tx.orm.public.RecurringExpense.where((entry) =>
        entry.id.eq(recurringId)
      ).update({ deletedAt: timestamp, isPaused: true, updatedAt: timestamp })
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
