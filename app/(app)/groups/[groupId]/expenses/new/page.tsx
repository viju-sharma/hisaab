import type { Metadata } from "next"

import { ExpenseForm } from "@/components/hisaab/expense-form"
import { PageHeader } from "@/components/hisaab/page-header"
import { listCategories } from "@/server/queries/expense"
import { getGroupDetail } from "@/server/queries/group"

export const metadata: Metadata = { title: "Add an expense" }

export default async function NewExpensePage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const [group, categories] = await Promise.all([
    getGroupDetail(groupId),
    listCategories(groupId),
  ])

  return (
    <>
      <PageHeader
        title="Add an expense"
        description="Record something you paid, or something someone else did."
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
      />
    </>
  )
}
