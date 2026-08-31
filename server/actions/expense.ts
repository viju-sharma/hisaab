"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"

import { ActionError, defineAction } from "@/lib/action"
import { requireGroupMember } from "@/lib/authz"
import { db } from "@/lib/db"
import { toExchangeRate } from "@/lib/db-decimal"
import { fromDate, now } from "@/lib/db-time"
import { publishEvent } from "@/lib/events"
import { newId } from "@/lib/id"
import { formatMoney } from "@/lib/money"
import { recordAudit } from "@/lib/observability/audit"
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

    const group = await db.orm.public.Group.where((entry) =>
      entry.id.eq(input.groupId)
    )
      .select("id", "name", "currency")
      .first()
    if (!group) throw new ActionError("That group no longer exists.")

    const built = await buildExpense(input, group.currency)

    const { expense, recipients } = await db.transaction(async (tx) => {
      const timestamp = now()
      const expenseId = newId()

      // Prisma 8 has no nested-create surface for the line tables, so the
      // parent and its lines are written as separate statements inside the one
      // transaction — the atomicity the nested form gave is unchanged.
      const created = await tx.orm.public.Expense.create({
        id: expenseId,
        groupId: input.groupId,
        description: input.description,
        notes: input.notes || null,
        categoryId: input.categoryId,
        currency: input.currency,
        amountMinor: input.amountMinor,
        exchangeRate: toExchangeRate(input.exchangeRate),
        groupAmountMinor: built.groupAmountMinor,
        date: fromDate(input.date),
        splitMethod: input.split.method,
        createdById: user.id,
        recurringExpenseId: null,
        receiptUrl: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      })

      const payers = await tx.orm.public.ExpensePayer.createAll(
        built.payers.map((payer) => ({ id: newId(), expenseId, ...payer }))
      )
      const splits = await tx.orm.public.ExpenseSplit.createAll(
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

      await recordAudit(tx, {
        action: "CREATE",
        entityType: "Expense",
        entityId: expenseId,
        groupId: input.groupId,
        after: { ...created, payers, splits },
      })

      const amount = formatMoney(input.amountMinor, input.currency)
      const notified = await publishEvent(tx, {
        groupId: input.groupId,
        actorId: user.id,
        type: "EXPENSE_ADDED",
        summary: `added ${input.description} for ${amount}`,
        entityType: "Expense",
        entityId: expenseId,
        data: { amountMinor: input.amountMinor, currency: input.currency },
        notify: {
          // Everyone who owes a share of it, not the whole group.
          userIds: built.splits.map((split) => split.userId),
          title: `${user.name ?? "Someone"} added ${input.description}`,
          body: `${amount} in ${group.name}`,
          href: `/groups/${input.groupId}/expenses/${expenseId}`,
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

    const group = await db.orm.public.Group.where((entry) =>
      entry.id.eq(input.groupId)
    )
      .select("currency")
      .first()
    if (!group) throw new ActionError("That group no longer exists.")

    const built = await buildExpense(input, group.currency)

    await db.transaction(async (tx) => {
      const before = await tx.orm.public.Expense.where((expense) =>
        expense.id.eq(expenseId)
      )
        .include("payers", (payer) => payer.select("userId", "amountMinor"))
        .include("splits", (split) => split.select("userId", "amountMinor"))
        .first()
      if (!before) throw new ActionError("That expense no longer exists.")
      if (before.groupId !== input.groupId) {
        throw new ActionError("That expense belongs to another group.")
      }
      if (before.deletedAt) throw new ActionError("That expense was deleted.")

      // Lines are replaced wholesale: an edit can change who is involved, and
      // reconciling row by row would leave orphans.
      await tx.orm.public.ExpensePayer.where((payer) =>
        payer.expenseId.eq(expenseId)
      ).deleteAndCount()
      await tx.orm.public.ExpenseSplit.where((split) =>
        split.expenseId.eq(expenseId)
      ).deleteAndCount()

      const updated = await tx.orm.public.Expense.where((expense) =>
        expense.id.eq(expenseId)
      ).update({
        description: input.description,
        notes: input.notes || null,
        categoryId: input.categoryId,
        currency: input.currency,
        amountMinor: input.amountMinor,
        exchangeRate: toExchangeRate(input.exchangeRate),
        groupAmountMinor: built.groupAmountMinor,
        date: fromDate(input.date),
        splitMethod: input.split.method,
        updatedAt: now(),
      })

      const payers = await tx.orm.public.ExpensePayer.createAll(
        built.payers.map((payer) => ({ id: newId(), expenseId, ...payer }))
      )
      const splits = await tx.orm.public.ExpenseSplit.createAll(
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

      await recordAudit(tx, {
        action: "UPDATE",
        entityType: "Expense",
        entityId: expenseId,
        groupId: input.groupId,
        before,
        after: { ...updated, payers, splits },
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
    const expense = await db.orm.public.Expense.where((entry) =>
      entry.id.eq(expenseId)
    )
      .include("splits", (split) => split.select("userId"))
      .first()
    if (!expense) throw new ActionError("That expense no longer exists.")

    await requireGroupMember(expense.groupId)
    if (expense.deletedAt)
      throw new ActionError("That expense is already deleted.")

    await db.transaction(async (tx) => {
      const timestamp = now()
      const updated = await tx.orm.public.Expense.where((entry) =>
        entry.id.eq(expenseId)
      ).update({ deletedAt: timestamp, updatedAt: timestamp })

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
    const expense = await db.orm.public.Expense.where((entry) =>
      entry.id.eq(expenseId)
    )
      .select("groupId", "description")
      .include("splits", (split) => split.select("userId"))
      .first()
    if (!expense) throw new ActionError("That expense no longer exists.")

    await requireGroupMember(expense.groupId)

    const comment = await db.transaction(async (tx) => {
      const timestamp = now()
      const created = await tx.orm.public.Comment.create({
        id: newId(),
        expenseId,
        userId: user.id,
        body,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
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
