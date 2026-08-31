import "server-only"

import { or } from "@prisma/orm-postgres/orm-client"

import { requireGroupMember } from "@/lib/authz"
import { db } from "@/lib/db"
import { toDate } from "@/lib/db-time"
import type { Timestamp } from "@/lib/db-time"

export type ExpenseListItem = Awaited<
  ReturnType<typeof listGroupExpenses>
>["expenses"][number]

/// Keyset pagination on (date, id): a stable key pair, so a new expense added
/// while someone is scrolling cannot shift the page boundary. Prisma 8's
/// `.cursor(...)` seeks on the ordering columns, so the token carries both.
function encodeCursor(date: Timestamp, id: string) {
  return `${date}|${id}`
}

function decodeCursor(cursor: string) {
  const separator = cursor.lastIndexOf("|")
  if (separator === -1) return null
  return {
    date: cursor.slice(0, separator) as Timestamp,
    id: cursor.slice(separator + 1),
  }
}

export async function listGroupExpenses(
  groupId: string,
  options: { cursor?: string; take?: number } = {}
) {
  const { user } = await requireGroupMember(groupId)
  const take = options.take ?? 30
  const cursor = options.cursor ? decodeCursor(options.cursor) : null

  let collection = db.orm.public.Expense.where((expense) =>
    expense.groupId.eq(groupId)
  )
    .where((expense) => expense.deletedAt.isNull())
    .select(
      "id",
      "description",
      "currency",
      "amountMinor",
      "groupAmountMinor",
      "date",
      "splitMethod"
    )
    .include("category", (category) => category.select("key", "label", "emoji"))
    .include("createdBy", (person) => person.select("id", "name", "imageUrl"))
    .include("payers", (payer) =>
      payer
        .select("userId", "groupAmountMinor")
        .include("user", (person) => person.select("name", "imageUrl"))
    )
    .include("splits", (split) => split.select("userId", "groupAmountMinor"))
    .include("comments", (comment) =>
      comment.where((entry) => entry.deletedAt.isNull()).count()
    )
    .orderBy([(expense) => expense.date.desc(), (expense) => expense.id.desc()])

  if (cursor) collection = collection.cursor(cursor)

  // One extra row is the "is there a next page" probe.
  const rows = await collection.limit(take + 1).all()

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
        date: toDate(expense.date),
        splitMethod: expense.splitMethod,
        category: expense.category,
        createdBy: expense.createdBy,
        payers: expense.payers.map((payer) => ({
          userId: payer.userId,
          name: payer.user.name ?? "Someone",
          imageUrl: payer.user.imageUrl,
          amountMinor: payer.groupAmountMinor,
        })),
        commentCount: expense.comments,
        /// The viewer's stake in this row: positive means they are up on it.
        myImpactMinor: paid - owed,
        involvesMe: paid !== 0 || owed !== 0,
      }
    }),
    nextCursor: hasMore
      ? encodeCursor(page[page.length - 1]!.date, page[page.length - 1]!.id)
      : null,
  }
}

export async function getExpenseDetail(expenseId: string) {
  const base = await db.orm.public.Expense.where((expense) =>
    expense.id.eq(expenseId)
  )
    .select("groupId", "deletedAt")
    .first()
  if (!base || base.deletedAt) return null

  const { user } = await requireGroupMember(base.groupId)

  const expense = await db.orm.public.Expense.where((entry) =>
    entry.id.eq(expenseId)
  )
    .select(
      "id",
      "groupId",
      "description",
      "notes",
      "currency",
      "amountMinor",
      "groupAmountMinor",
      "date",
      "splitMethod",
      "createdAt"
    )
    .include("category", (category) =>
      category.select("id", "key", "label", "emoji")
    )
    .include("createdBy", (person) => person.select("id", "name", "imageUrl"))
    .include("group", (group) => group.select("id", "name", "currency"))
    .include("payers", (payer) =>
      payer
        .select("userId", "amountMinor")
        .include("user", (person) => person.select("name", "imageUrl"))
    )
    .include("splits", (split) =>
      split
        .select("userId", "amountMinor", "weight", "percentBp")
        .include("user", (person) => person.select("name", "imageUrl"))
    )
    .include("comments", (comment) =>
      comment
        .where((entry) => entry.deletedAt.isNull())
        .orderBy((entry) => entry.createdAt.asc())
        .select("id", "body", "createdAt")
        .include("user", (person) => person.select("id", "name", "imageUrl"))
    )
    .first()

  if (!expense) return null

  return {
    ...expense,
    date: toDate(expense.date),
    createdAt: toDate(expense.createdAt),
    comments: expense.comments.map((comment) => ({
      ...comment,
      createdAt: toDate(comment.createdAt),
    })),
    viewerId: user.id,
  }
}

/// System categories plus anything the group has added.
export async function listCategories(groupId: string) {
  return db.orm.public.Category.where((category) =>
    or(category.groupId.isNull(), category.groupId.eq(groupId))
  )
    .orderBy([
      (category) => category.sortOrder.asc(),
      (category) => category.label.asc(),
    ])
    .select("id", "key", "label", "emoji")
    .all()
}
