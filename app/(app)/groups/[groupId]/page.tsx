import Link from "next/link"
import { format, isThisYear, isToday, isYesterday } from "date-fns"
import { Plus, Receipt } from "lucide-react"

import { Money } from "@/components/hisaab/money"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { listGroupExpenses } from "@/server/queries/expense"
import { getGroupDetail } from "@/server/queries/group"

function dayLabel(date: Date) {
  if (isToday(date)) return "Today"
  if (isYesterday(date)) return "Yesterday"
  return format(date, isThisYear(date) ? "EEEE, d MMMM" : "d MMMM yyyy")
}

export default async function GroupExpensesPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const [{ expenses }, group] = await Promise.all([
    listGroupExpenses(groupId),
    getGroupDetail(groupId),
  ])

  if (expenses.length === 0) {
    return (
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyTitle>No expenses yet</EmptyTitle>
          <EmptyDescription>
            Add the first one — you can record something you paid, or something
            someone else did.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="sm">
            <Link href={`/groups/${groupId}/expenses/new`}>
              <Plus data-icon="inline-start" />
              Add an expense
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  // Grouped by day so a long ledger reads as a diary rather than a wall of rows.
  const days = new Map<string, typeof expenses>()
  for (const expense of expenses) {
    const key = dayLabel(expense.date)
    days.set(key, [...(days.get(key) ?? []), expense])
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button asChild size="sm" className="hidden md:inline-flex">
          <Link href={`/groups/${groupId}/expenses/new`}>
            <Plus data-icon="inline-start" />
            Add an expense
          </Link>
        </Button>
      </div>

      {[...days.entries()].map(([day, rows]) => (
        <section key={day}>
          <h2 className="pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {day}
          </h2>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {rows.map((expense, index) => (
              <li key={expense.id} style={{ "--stagger": index } as React.CSSProperties}>
                <Link
                  href={`/groups/${groupId}/expenses/${expense.id}`}
                  className="animate-row-in flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-base">
                    {expense.category?.emoji ?? <Receipt className="size-4" />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {expense.description}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {expense.payers.length === 1
                        ? `${expense.payers[0]!.name} paid`
                        : `${expense.payers.length} people paid`}{" "}
                      <Money
                        minor={expense.amountMinor}
                        currency={expense.currency}
                      />
                      {expense.commentCount > 0
                        ? ` · ${expense.commentCount} comment${expense.commentCount === 1 ? "" : "s"}`
                        : ""}
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    {expense.involvesMe ? (
                      <>
                        <span
                          data-slot="money"
                          className={
                            expense.myImpactMinor >= 0
                              ? "tabular block text-sm font-medium text-positive"
                              : "tabular block text-sm font-medium text-negative"
                          }
                        >
                          <Money
                            minor={Math.abs(expense.myImpactMinor)}
                            currency={group.currency}
                          />
                        </span>
                        <span className="text-[0.65rem] text-muted-foreground">
                          {expense.myImpactMinor >= 0 ? "you lent" : "you owe"}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        not involved
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
