import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { Pencil } from "lucide-react"

import { CommentBox } from "@/components/hisaab/comment-box"
import { DeleteExpenseButton } from "@/components/hisaab/delete-expense-button"
import { MemberAvatar } from "@/components/hisaab/member-avatar"
import { CategoryIcon } from "@/components/hisaab/category-icon"
import { Money } from "@/components/hisaab/money"
import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/hisaab/section-heading"
import { getExpenseDetail } from "@/server/queries/expense"

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; expenseId: string }>
}) {
  const { expenseId } = await params
  const expense = await getExpenseDetail(expenseId)
  if (!expense) notFound()

  const foreign = expense.currency !== expense.group.currency

  return (
    <div className="space-y-6 pb-8">
      <header className="rounded-2xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {expense.category ? (
                <>
                  <CategoryIcon categoryKey={expense.category.key} className="size-3.5" />
                  {expense.category.label}
                </>
              ) : (
                "Uncategorised"
              )}
            </p>
            <h1 className="mt-1 font-display text-xl tracking-tight text-balance">
              {expense.description}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {format(expense.date, "d MMMM yyyy")} · added by{" "}
              {expense.createdBy.name ?? "someone"}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button asChild variant="ghost" size="icon-sm">
              <Link
                href={`/groups/${expense.groupId}/expenses/${expense.id}/edit`}
                aria-label="Edit this expense"
              >
                <Pencil />
              </Link>
            </Button>
            <DeleteExpenseButton
              expenseId={expense.id}
              groupId={expense.groupId}
            />
          </div>
        </div>

        <p className="mt-4 font-sans text-3xl font-semibold tracking-tight tabular">
          <Money minor={expense.amountMinor} currency={expense.currency} />
        </p>
        {foreign ? (
          <p className="text-xs text-muted-foreground">
            <Money
              minor={expense.groupAmountMinor}
              currency={expense.group.currency}
            />{" "}
            at the rate recorded when this expense was added
          </p>
        ) : null}

        {expense.notes ? (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
            {expense.notes}
          </p>
        ) : null}
      </header>

      <section>
        <SectionHeading>Paid by</SectionHeading>
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {expense.payers.map((payer) => (
            <li key={payer.userId} className="flex items-center gap-3 px-4 py-3">
              <MemberAvatar
                member={{
                  userId: payer.userId,
                  name: payer.user.name ?? "Someone",
                  imageUrl: payer.user.imageUrl,
                }}
              />
              <span className="min-w-0 flex-1 truncate text-sm">
                {payer.user.name ?? "Someone"}
                {payer.userId === expense.viewerId ? " (you)" : ""}
              </span>
              <span className="text-sm font-medium text-positive">
                <Money minor={payer.amountMinor} currency={expense.currency} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionHeading>Split {expense.splitMethod.toLowerCase()}</SectionHeading>
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {expense.splits.map((split) => (
            <li key={split.userId} className="flex items-center gap-3 px-4 py-3">
              <MemberAvatar
                member={{
                  userId: split.userId,
                  name: split.user.name ?? "Someone",
                  imageUrl: split.user.imageUrl,
                }}
              />
              <span className="min-w-0 flex-1 truncate text-sm">
                {split.user.name ?? "Someone"}
                {split.userId === expense.viewerId ? " (you)" : ""}
                {split.percentBp != null ? (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {split.percentBp / 100}%
                  </span>
                ) : null}
                {split.weight != null && split.percentBp == null ? (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {split.weight} {split.weight === 1 ? "share" : "shares"}
                  </span>
                ) : null}
              </span>
              <span className="text-sm font-medium">
                <Money minor={split.amountMinor} currency={expense.currency} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <CommentBox
        expenseId={expense.id}
        viewerId={expense.viewerId}
        comments={expense.comments}
      />
    </div>
  )
}
