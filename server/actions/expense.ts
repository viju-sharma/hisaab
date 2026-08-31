"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"

import { ActionError, defineAction } from "@/lib/action"
import { requireGroupMember } from "@/lib/authz"
import { publishEvent } from "@/lib/events"
import { convertMinor, formatMoney } from "@/lib/money"
import { recordAudit } from "@/lib/observability/audit"
import { prisma } from "@/lib/prisma"
import { sendPushToUsers } from "@/lib/push"
import {
  SplitError,
  allocateByWeight,
  assertPayersCoverTotal,
  computeSplits,
} from "@/lib/split"
import {
  commentSchema,
  createExpenseSchema,
  expenseIdSchema,
  updateExpenseSchema,
  type CreateExpenseInput,
} from "@/lib/validation"

type Line = { userId: string; amountMinor: number; groupAmountMinor: number }

type BuiltExpense = {
  groupAmountMinor: number
  payers: Line[]
  splits: (Line & { weight?: number; percentBp?: number })[]
  memberIds: string[]
}

/// Turns a submitted form into ledger lines. Splits are resolved in the
/// expense's own currency (what the user typed), then the group-currency figures
/// are allocated from the converted total by the same weights — so both columns
/// sum exactly to their own total and no rounding escapes.
async function buildExpense(
  input: CreateExpenseInput,
  groupCurrency: string
): Promise<BuiltExpense> {
  const members = await prisma.groupMember.findMany({
    where: { groupId: input.groupId, leftAt: null },
    select: { userId: true },
  })
  const memberIds = members.map((member) => member.userId)
  const memberSet = new Set(memberIds)

  const referenced = new Set<string>([
    ...input.payers.map((payer) => payer.userId),
    ...participantsOf(input),
  ])
  for (const userId of referenced) {
    if (!memberSet.has(userId)) {
      throw new ActionError("Someone in this expense is not in the group.")
    }
  }

  try {
    assertPayersCoverTotal(input.amountMinor, input.payers, input.currency)
    const splits = computeSplits(input.amountMinor, input.split, input.currency)

    const groupTotal = convertMinor(
      input.amountMinor,
      input.currency,
      groupCurrency,
      input.exchangeRate
    )

    const payerGroupAmounts = byUser(
      allocateByWeight(
        groupTotal,
        input.payers.map((payer) => ({
          userId: payer.userId,
          weight: payer.amountMinor,
        }))
      )
    )
    const splitGroupAmounts = byUser(
      allocateByWeight(
        groupTotal,
        splits.map((split) => ({
          userId: split.userId,
          weight: split.amountMinor,
        }))
      )
    )

    return {
      groupAmountMinor: groupTotal,
      payers: input.payers.map((payer) => ({
        userId: payer.userId,
        amountMinor: payer.amountMinor,
        groupAmountMinor: payerGroupAmounts.get(payer.userId) ?? 0,
      })),
      splits: splits.map((split) => ({
        userId: split.userId,
        amountMinor: split.amountMinor,
        groupAmountMinor: splitGroupAmounts.get(split.userId) ?? 0,
        weight: split.weight,
        percentBp: split.percentBp,
      })),
      memberIds,
    }
  } catch (error) {
    // Split problems are the user's to fix, so they surface verbatim.
    if (error instanceof SplitError) throw new ActionError(error.message)
    throw error
  }
}

function participantsOf(input: CreateExpenseInput): string[] {
  switch (input.split.method) {
    case "EQUAL":
      return input.split.participants
    case "SHARES":
      return input.split.shares.map((entry) => entry.userId)
    case "PERCENT":
      return input.split.percents.map((entry) => entry.userId)
    case "EXACT":
      return input.split.amounts.map((entry) => entry.userId)
    case "ITEMISED":
      return input.split.items.flatMap((item) => item.participants)
  }
}

function byUser(allocations: { userId: string; amountMinor: number }[]) {
  return new Map(allocations.map((entry) => [entry.userId, entry.amountMinor]))
}

export const createExpense = defineAction(
  "expense.create",
  createExpenseSchema,
  async (input, user) => {
    await requireGroupMember(input.groupId)

    const group = await prisma.group.findUniqueOrThrow({
      where: { id: input.groupId },
      select: { id: true, name: true, currency: true },
    })
    const built = await buildExpense(input, group.currency)

    const { expense, recipients } = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          groupId: input.groupId,
          description: input.description,
          notes: input.notes || null,
          categoryId: input.categoryId,
          currency: input.currency,
          amountMinor: input.amountMinor,
          exchangeRate: input.exchangeRate,
          groupAmountMinor: built.groupAmountMinor,
          date: input.date,
          splitMethod: input.split.method,
          createdById: user.id,
          payers: { createMany: { data: built.payers } },
          splits: { createMany: { data: built.splits } },
        },
        include: { payers: true, splits: true },
      })

      await recordAudit(tx, {
        action: "CREATE",
        entityType: "Expense",
        entityId: created.id,
        groupId: input.groupId,
        after: created,
      })

      const amount = formatMoney(input.amountMinor, input.currency)
      const notified = await publishEvent(tx, {
        groupId: input.groupId,
        actorId: user.id,
        type: "EXPENSE_ADDED",
        summary: `added ${input.description} for ${amount}`,
        entityType: "Expense",
        entityId: created.id,
        data: { amountMinor: input.amountMinor, currency: input.currency },
        notify: {
          // Everyone who owes a share of it, not the whole group.
          userIds: built.splits.map((split) => split.userId),
          title: `${user.name ?? "Someone"} added ${input.description}`,
          body: `${amount} in ${group.name}`,
          href: `/groups/${input.groupId}/expenses/${created.id}`,
        },
      })

      return { expense: created, recipients: notified }
    })

    after(() =>
      sendPushToUsers(recipients, {
        title: `${user.name ?? "Someone"} added ${input.description}`,
        body: `${formatMoney(input.amountMinor, input.currency)} in ${group.name}`,
        href: `/groups/${input.groupId}/expenses/${expense.id}`,
        tag: `expense-${expense.id}`,
      })
    )

    revalidatePath(`/groups/${input.groupId}`)
    revalidatePath("/dashboard")
    return { expenseId: expense.id }
  }
)

export const updateExpense = defineAction(
  "expense.update",
  updateExpenseSchema,
  async ({ expenseId, ...input }, user) => {
    await requireGroupMember(input.groupId)

    const group = await prisma.group.findUniqueOrThrow({
      where: { id: input.groupId },
      select: { currency: true },
    })
    const built = await buildExpense(input, group.currency)

    await prisma.$transaction(async (tx) => {
      const before = await tx.expense.findUniqueOrThrow({
        where: { id: expenseId },
        include: { payers: true, splits: true },
      })
      if (before.groupId !== input.groupId) {
        throw new ActionError("That expense belongs to another group.")
      }
      if (before.deletedAt) throw new ActionError("That expense was deleted.")

      // Lines are replaced wholesale: an edit can change who is involved, and
      // reconciling row by row would leave orphans.
      await tx.expensePayer.deleteMany({ where: { expenseId } })
      await tx.expenseSplit.deleteMany({ where: { expenseId } })

      const updated = await tx.expense.update({
        where: { id: expenseId },
        data: {
          description: input.description,
          notes: input.notes || null,
          categoryId: input.categoryId,
          currency: input.currency,
          amountMinor: input.amountMinor,
          exchangeRate: input.exchangeRate,
          groupAmountMinor: built.groupAmountMinor,
          date: input.date,
          splitMethod: input.split.method,
          payers: { createMany: { data: built.payers } },
          splits: { createMany: { data: built.splits } },
        },
        include: { payers: true, splits: true },
      })

      await recordAudit(tx, {
        action: "UPDATE",
        entityType: "Expense",
        entityId: expenseId,
        groupId: input.groupId,
        before,
        after: updated,
      })
      await publishEvent(tx, {
        groupId: input.groupId,
        actorId: user.id,
        type: "EXPENSE_UPDATED",
        summary: `updated ${input.description}`,
        entityType: "Expense",
        entityId: expenseId,
        notify: {
          userIds: built.splits.map((split) => split.userId),
          title: `${user.name ?? "Someone"} updated ${input.description}`,
          href: `/groups/${input.groupId}/expenses/${expenseId}`,
        },
      })
    })

    revalidatePath(`/groups/${input.groupId}`)
    revalidatePath("/dashboard")
    return { expenseId }
  }
)

export const deleteExpense = defineAction(
  "expense.delete",
  expenseIdSchema,
  async ({ expenseId }, user) => {
    const expense = await prisma.expense.findUniqueOrThrow({
      where: { id: expenseId },
      include: { splits: { select: { userId: true } } },
    })
    await requireGroupMember(expense.groupId)
    if (expense.deletedAt) throw new ActionError("That expense is already deleted.")

    await prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id: expenseId },
        data: { deletedAt: new Date() },
      })
      await recordAudit(tx, {
        action: "DELETE",
        entityType: "Expense",
        entityId: expenseId,
        groupId: expense.groupId,
        before: expense,
        after: updated,
      })
      await publishEvent(tx, {
        groupId: expense.groupId,
        actorId: user.id,
        type: "EXPENSE_DELETED",
        summary: `deleted ${expense.description}`,
        entityType: "Expense",
        entityId: expenseId,
        notify: {
          userIds: expense.splits.map((split) => split.userId),
          title: `${user.name ?? "Someone"} deleted ${expense.description}`,
          href: `/groups/${expense.groupId}`,
        },
      })
    })

    revalidatePath(`/groups/${expense.groupId}`)
    revalidatePath("/dashboard")
    return { groupId: expense.groupId }
  }
)

export const addComment = defineAction(
  "expense.comment",
  commentSchema,
  async ({ expenseId, body }, user) => {
    const expense = await prisma.expense.findUniqueOrThrow({
      where: { id: expenseId },
      select: {
        groupId: true,
        description: true,
        splits: { select: { userId: true } },
      },
    })
    await requireGroupMember(expense.groupId)

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: { expenseId, userId: user.id, body },
      })
      await recordAudit(tx, {
        action: "CREATE",
        entityType: "Comment",
        entityId: created.id,
        groupId: expense.groupId,
        after: created,
      })
      await publishEvent(tx, {
        groupId: expense.groupId,
        actorId: user.id,
        type: "COMMENT_ADDED",
        summary: `commented on ${expense.description}`,
        entityType: "Expense",
        entityId: expenseId,
        notify: {
          userIds: expense.splits.map((split) => split.userId),
          title: `${user.name ?? "Someone"} commented on ${expense.description}`,
          body,
          href: `/groups/${expense.groupId}/expenses/${expenseId}`,
        },
      })
      return created
    })

    revalidatePath(`/groups/${expense.groupId}/expenses/${expenseId}`)
    return { commentId: comment.id }
  }
)
