import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ExpenseForm } from "@/components/hisaab/expense-form"
import { PageHeader } from "@/components/hisaab/page-header"
import { getExpenseDetail, listCategories } from "@/server/queries/expense"
import { getGroupDetail } from "@/server/queries/group"

export const metadata: Metadata = { title: "Edit expense" }

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ groupId: string; expenseId: string }>
}) {
  const { groupId, expenseId } = await params
  const expense = await getExpenseDetail(expenseId)
  if (!expense || expense.groupId !== groupId) notFound()

  const [group, categories] = await Promise.all([
    getGroupDetail(groupId),
    listCategories(groupId),
  ])

  return (
    <>
      <PageHeader
        title="Edit expense"
        description="Everyone's balance updates as soon as you save, and the change is recorded in the group's activity."
      />
      <ExpenseForm
        groupId={groupId}
        groupCurrency={group.currency}
        members={group.members.map((member) => ({
          userId: member.userId,
          name: member.name,
          imageUrl: member.imageUrl,
        }))}
        categories={categories}
        viewerId={group.viewer.userId}
        initial={{
          expenseId: expense.id,
          description: expense.description,
          notes: expense.notes ?? "",
          categoryId: expense.category?.id ?? null,
          currency: expense.currency,
          amountMinor: expense.amountMinor,
          date: expense.date,
          // ITEMISED expenses fall back to exact amounts in the form: the
          // per-item breakdown has no editor yet, and the resolved amounts are
          // exactly what the ledger stores.
          splitMethod:
            expense.splitMethod === "ITEMISED" ? "EXACT" : expense.splitMethod,
          payers: expense.payers.map((payer) => ({
            userId: payer.userId,
            amountMinor: payer.amountMinor,
          })),
          splits: expense.splits.map((split) => ({
            userId: split.userId,
            amountMinor: split.amountMinor,
            weight: split.weight,
            percentBp: split.percentBp,
          })),
        }}
      />
    </>
  )
}
