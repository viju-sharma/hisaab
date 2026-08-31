import type { NextRequest } from "next/server"

import { isAuthorisedCron } from "@/lib/cron"
import { publishEvent } from "@/lib/events"
import { formatMoney } from "@/lib/money"
import { recordAudit } from "@/lib/observability/audit"
import { log } from "@/lib/observability/logger"
import { withBackgroundContext } from "@/lib/observability/request"
import { withSpan } from "@/lib/observability/span"
import { prisma } from "@/lib/prisma"
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

    const templates = await prisma.recurringExpense.findMany({
      where: {
        isPaused: false,
        deletedAt: null,
        nextRunAt: { lte: now },
        group: { deletedAt: null, archivedAt: null },
      },
      include: { group: { select: { id: true, name: true, currency: true } } },
    })

    log.info("cron.recurring.scan", { due: templates.length })

    let created = 0
    let skipped = 0

    for (const template of templates) {
      const rule = {
        frequency: template.frequency,
        interval: template.interval,
        anchorDay: template.anchorDay,
        weekday: template.weekday,
        endDate: template.endDate,
      }

      const occurrences = dueOccurrences(
        rule,
        template.lastRunAt,
        template.startDate,
        now
      )

      for (const occurrence of occurrences) {
        const outcome = await withSpan(
          "recurring.materialise",
          () => materialise(template, occurrence),
          { recurringId: template.id, on: occurrence.toISOString() }
        )
        if (outcome === "created") created += 1
        else skipped += 1
      }

      const upcoming = nextOccurrence(rule, occurrences.at(-1) ?? now)
      await prisma.recurringExpense.update({
        where: { id: template.id },
        data: {
          lastRunAt: occurrences.at(-1) ?? template.lastRunAt,
          nextRunAt: upcoming ?? template.nextRunAt,
          isPaused: upcoming ? template.isPaused : true,
        },
      })
    }

    log.info("cron.recurring.done", { created, skipped })
    return Response.json({ created, skipped, scanned: templates.length })
  })
}

type Template = Awaited<
  ReturnType<typeof prisma.recurringExpense.findMany>
>[number] & { group: { id: string; name: string; currency: string } }

async function materialise(template: Template, occurrence: Date) {
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
    await prisma.recurringRun.create({
      data: {
        recurringExpenseId: template.id,
        scheduledFor: occurrence,
        error: "Template no longer valid",
      },
    })
    log.warn("recurring.invalid", { recurringId: template.id })
    return "skipped" as const
  }

  const built = await buildExpense(parsed.data, template.group.currency)

  try {
    const recipients = await prisma.$transaction(async (tx) => {
      // Claim the slot first: the unique key on (template, scheduledFor) makes
      // a concurrent or repeated run collide here instead of double-charging.
      const run = await tx.recurringRun.create({
        data: {
          recurringExpenseId: template.id,
          scheduledFor: occurrence,
        },
      })

      const expense = await tx.expense.create({
        data: {
          groupId: template.groupId,
          description: template.description,
          notes: template.notes,
          categoryId: template.categoryId,
          currency: template.currency,
          amountMinor: template.amountMinor,
          exchangeRate: 1,
          groupAmountMinor: built.groupAmountMinor,
          date: occurrence,
          splitMethod: template.splitMethod,
          createdById: template.createdById,
          recurringExpenseId: template.id,
          payers: { createMany: { data: built.payers } },
          splits: { createMany: { data: built.splits } },
        },
      })

      await tx.recurringRun.update({
        where: { id: run.id },
        data: { expenseId: expense.id },
      })

      await recordAudit(tx, {
        action: "CREATE",
        entityType: "Expense",
        entityId: expense.id,
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
        entityId: expense.id,
        notify: {
          userIds: built.splits.map((split) => split.userId),
          title: `${template.description} was added automatically`,
          body: `${formatMoney(template.amountMinor, template.currency)} in ${template.group.name}`,
          href: `/groups/${template.groupId}/expenses/${expense.id}`,
        },
      })
    })

    await sendPushToUsers(recipients, {
      title: `${template.description} was added automatically`,
      body: `${formatMoney(template.amountMinor, template.currency)} in ${template.group.name}`,
      href: `/groups/${template.groupId}`,
      tag: `recurring-${template.id}`,
    })

    return "created" as const
  } catch (error) {
    // A unique-constraint failure means another run already claimed this slot.
    if ((error as { code?: string }).code === "P2002") {
      log.debug("recurring.alreadyMaterialised", { recurringId: template.id })
      return "skipped" as const
    }
    throw error
  }
}
