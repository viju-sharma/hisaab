import type { NextRequest } from "next/server"

import { isAuthorisedCron } from "@/lib/cron"
import { db, isUniqueViolation } from "@/lib/db"
import { toExchangeRate } from "@/lib/db-decimal"
import {
  fromDate,
  fromDateOrNull,
  now as timestampNow,
  toDate,
  toDateOrNull,
} from "@/lib/db-time"
import { publishEvent } from "@/lib/events"
import { newId } from "@/lib/id"
import { formatMoney } from "@/lib/money"
import { recordAudit } from "@/lib/observability/audit"
import { log } from "@/lib/observability/logger"
import { withBackgroundContext } from "@/lib/observability/request"
import { withSpan } from "@/lib/observability/span"
import { sendPushToUsers } from "@/lib/push"
import { dueOccurrences, nextOccurrence } from "@/lib/recurrence"
import { createExpenseSchema } from "@/lib/validation"
import { buildExpense } from "@/server/services/expense"

export const maxDuration = 300

/// Materialises every recurring template that has fallen due. Safe to re-run:
/// each occurrence is claimed by a RecurringRun row whose unique key makes a
/// duplicate insert fail rather than creating a second expense.
export async function GET(request: NextRequest) {
  if (!isAuthorisedCron(request)) {
    return new Response("Unauthorised", { status: 401 })
  }

  return withBackgroundContext("cron:recurring", async () => {
    const now = new Date()

    // The ORM has no predicate across a to-one relation, so the live groups are
    // resolved first and the templates are scoped to them.
    const liveGroups = await db.orm.public.Group.where((group) =>
      group.deletedAt.isNull()
    )
      .where((group) => group.archivedAt.isNull())
      .select("id", "name", "currency")
      .all()

    const groupById = new Map(liveGroups.map((group) => [group.id, group]))

    const templates = liveGroups.length
      ? await db.orm.public.RecurringExpense.where((template) =>
          template.isPaused.eq(false)
        )
          .where((template) => template.deletedAt.isNull())
          .where((template) => template.nextRunAt.lte(fromDate(now)))
          .where((template) => template.groupId.in([...groupById.keys()]))
          .all()
      : []

    log.info("cron.recurring.scan", { due: templates.length })

    let created = 0
    let skipped = 0

    for (const template of templates) {
      const group = groupById.get(template.groupId)!
      const rule = {
        frequency: template.frequency,
        interval: template.interval,
        anchorDay: template.anchorDay,
        weekday: template.weekday,
        endDate: toDateOrNull(template.endDate),
      }

      const occurrences = dueOccurrences(
        rule,
        toDateOrNull(template.lastRunAt),
        toDate(template.startDate),
        now
      )

      for (const occurrence of occurrences) {
        const outcome = await withSpan(
          "recurring.materialise",
          () => materialise(template, group, occurrence),
          { recurringId: template.id, on: occurrence.toISOString() }
        )
        if (outcome === "created") created += 1
        else skipped += 1
      }

      const lastOccurrence = occurrences.at(-1)
      const upcoming = nextOccurrence(rule, lastOccurrence ?? now)
      await db.orm.public.RecurringExpense.where((entry) =>
        entry.id.eq(template.id)
      ).update({
        lastRunAt: fromDateOrNull(lastOccurrence) ?? template.lastRunAt,
        nextRunAt: upcoming ? fromDate(upcoming) : template.nextRunAt,
        isPaused: upcoming ? template.isPaused : true,
        updatedAt: timestampNow(),
      })
    }

    log.info("cron.recurring.done", { created, skipped })
    return Response.json({ created, skipped, scanned: templates.length })
  })
}

type Template = Awaited<
  ReturnType<typeof db.orm.public.RecurringExpense.all>
>[number]
type Group = { id: string; name: string; currency: string }

async function materialise(template: Template, group: Group, occurrence: Date) {
  const parsed = createExpenseSchema.safeParse({
    groupId: template.groupId,
    description: template.description,
    notes: template.notes ?? "",
    categoryId: template.categoryId,
    currency: template.currency,
    amountMinor: template.amountMinor,
    exchangeRate: 1,
    date: occurrence,
    payers: template.payerConfig,
    split: template.splitConfig,
  })

  if (!parsed.success) {
    // A template can go stale — a member leaves and their split no longer
    // validates. Record why rather than failing the whole run.
    await db.orm.public.RecurringRun.create({
      id: newId(),
      recurringExpenseId: template.id,
      scheduledFor: fromDate(occurrence),
      ranAt: timestampNow(),
      expenseId: null,
      error: "Template no longer valid",
    })
    log.warn("recurring.invalid", { recurringId: template.id })
    return "skipped" as const
  }

  const built = await buildExpense(parsed.data, group.currency)

  try {
    const recipients = await db.transaction(async (tx) => {
      const timestamp = timestampNow()

      // Claim the slot first: the unique key on (template, scheduledFor) makes
      // a concurrent or repeated run collide here instead of double-charging.
      const run = await tx.orm.public.RecurringRun.create({
        id: newId(),
        recurringExpenseId: template.id,
        scheduledFor: fromDate(occurrence),
        ranAt: timestamp,
        expenseId: null,
        error: null,
      })

      const expenseId = newId()
      const expense = await tx.orm.public.Expense.create({
        id: expenseId,
        groupId: template.groupId,
        description: template.description,
        notes: template.notes,
        categoryId: template.categoryId,
        currency: template.currency,
        amountMinor: template.amountMinor,
        exchangeRate: toExchangeRate(1),
        groupAmountMinor: built.groupAmountMinor,
        date: fromDate(occurrence),
        splitMethod: template.splitMethod,
        createdById: template.createdById,
        recurringExpenseId: template.id,
        receiptUrl: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      })

      await tx.orm.public.ExpensePayer.createAll(
        built.payers.map((payer) => ({ id: newId(), expenseId, ...payer }))
      )
      await tx.orm.public.ExpenseSplit.createAll(
        built.splits.map((split) => ({
          id: newId(),
          expenseId,
          userId: split.userId,
          amountMinor: split.amountMinor,
          groupAmountMinor: split.groupAmountMinor,
          weight: split.weight ?? null,
          percentBp: split.percentBp ?? null,
        }))
      )

      await tx.orm.public.RecurringRun.where((entry) =>
        entry.id.eq(run.id)
      ).update({ expenseId })

      await recordAudit(tx, {
        action: "CREATE",
        entityType: "Expense",
        entityId: expenseId,
        groupId: template.groupId,
        after: expense,
      })
      return publishEvent(tx, {
        groupId: template.groupId,
        actorId: template.createdById,
        type: "RECURRING_GENERATED",
        summary: `${template.description} recurred for ${formatMoney(
          template.amountMinor,
          template.currency
        )}`,
        entityType: "Expense",
        entityId: expenseId,
        notify: {
          userIds: built.splits.map((split) => split.userId),
          title: `${template.description} was added automatically`,
          body: `${formatMoney(template.amountMinor, template.currency)} in ${group.name}`,
          href: `/groups/${template.groupId}/expenses/${expenseId}`,
        },
      })
    })

    await sendPushToUsers(recipients, {
      title: `${template.description} was added automatically`,
      body: `${formatMoney(template.amountMinor, template.currency)} in ${group.name}`,
      href: `/groups/${template.groupId}`,
      tag: `recurring-${template.id}`,
    })

    return "created" as const
  } catch (error) {
    // A unique-constraint failure means another run already claimed this slot.
    if (isUniqueViolation(error)) {
      log.debug("recurring.alreadyMaterialised", { recurringId: template.id })
      return "skipped" as const
    }
    throw error
  }
}
