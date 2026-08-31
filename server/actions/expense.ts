"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"

import { ActionError, defineAction } from "@/lib/action"
import { requireGroupMember } from "@/lib/authz"
import { publishEvent } from "@/lib/events"
import { formatMoney } from "@/lib/money"
import { recordAudit } from "@/lib/observability/audit"
import { prisma } from "@/lib/prisma"
import { sendPushToUsers } from "@/lib/push"
import {
  commentSchema,
  createExpenseSchema,
  expenseIdSchema,
  updateExpenseSchema,
} from "@/lib/validation"
import { buildExpense } from "@/server/services/expense"

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
