import "server-only"

import { requireGroupMember } from "@/lib/authz"
import { prisma } from "@/lib/prisma"

export type ExpenseListItem = Awaited<
  ReturnType<typeof listGroupExpenses>
>["expenses"][number]

/// Cursor pagination on (date, id): a stable key pair, so a new expense added
/// while someone is scrolling cannot shift the page boundary.
export async function listGroupExpenses(
  groupId: string,
  options: { cursor?: string; take?: number } = {}
) {
  const { user } = await requireGroupMember(groupId)
  const take = options.take ?? 30

  const rows = await prisma.expense.findMany({
    where: { groupId, deletedAt: null },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      description: true,
      currency: true,
      amountMinor: true,
      groupAmountMinor: true,
      date: true,
      splitMethod: true,
      category: { select: { key: true, label: true, emoji: true } },
      createdBy: { select: { id: true, name: true, imageUrl: true } },
      payers: {
        select: {
          userId: true,
          groupAmountMinor: true,
          user: { select: { name: true, imageUrl: true } },
        },
      },
      splits: { select: { userId: true, groupAmountMinor: true } },
      _count: { select: { comments: { where: { deletedAt: null } } } },
    },
  })

  const hasMore = rows.length > take
  const page = hasMore ? rows.slice(0, take) : rows

  return {
    expenses: page.map((expense) => {
      const paid =
        expense.payers.find((payer) => payer.userId === user.id)
          ?.groupAmountMinor ?? 0
      const owed =
        expense.splits.find((split) => split.userId === user.id)
          ?.groupAmountMinor ?? 0
      return {
        id: expense.id,
        description: expense.description,
        currency: expense.currency,
        amountMinor: expense.amountMinor,
        groupAmountMinor: expense.groupAmountMinor,
        date: expense.date,
        splitMethod: expense.splitMethod,
        category: expense.category,
        createdBy: expense.createdBy,
        payers: expense.payers.map((payer) => ({
          userId: payer.userId,
          name: payer.user.name ?? "Someone",
          imageUrl: payer.user.imageUrl,
          amountMinor: payer.groupAmountMinor,
        })),
        commentCount: expense._count.comments,
        /// The viewer's stake in this row: positive means they are up on it.
        myImpactMinor: paid - owed,
        involvesMe: paid !== 0 || owed !== 0,
      }
    }),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  }
}

export async function getExpenseDetail(expenseId: string) {
  const base = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { groupId: true, deletedAt: true },
  })
  if (!base || base.deletedAt) return null

  const { user } = await requireGroupMember(base.groupId)

  const expense = await prisma.expense.findUniqueOrThrow({
    where: { id: expenseId },
    select: {
      id: true,
      groupId: true,
      description: true,
      notes: true,
      currency: true,
      amountMinor: true,
      groupAmountMinor: true,
      date: true,
      splitMethod: true,
      createdAt: true,
      category: { select: { id: true, key: true, label: true, emoji: true } },
      createdBy: { select: { id: true, name: true, imageUrl: true } },
      group: { select: { id: true, name: true, currency: true } },
      payers: {
        select: {
          userId: true,
          amountMinor: true,
          user: { select: { name: true, imageUrl: true } },
        },
      },
      splits: {
        select: {
          userId: true,
          amountMinor: true,
          weight: true,
          percentBp: true,
          user: { select: { name: true, imageUrl: true } },
        },
      },
      comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          user: { select: { id: true, name: true, imageUrl: true } },
        },
      },
    },
  })

  return { ...expense, viewerId: user.id }
}

/// System categories plus anything the group has added.
export async function listCategories(groupId: string) {
  return prisma.category.findMany({
    where: { OR: [{ groupId: null }, { groupId }] },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: { id: true, key: true, label: true, emoji: true },
  })
}
