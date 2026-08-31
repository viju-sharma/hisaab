import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Plus } from "lucide-react"

import { GroupMark } from "@/components/hisaab/group-mark"
import { BalanceAmount, BalancePill, Money } from "@/components/hisaab/money"
import { PageHeader } from "@/components/hisaab/page-header"
import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/hisaab/section-heading"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { getDashboard } from "@/server/queries/balance"

export const metadata: Metadata = { title: "Home" }

export default async function DashboardPage() {
  const { groups, totals, viewerName } = await getDashboard()
  const active = groups.filter((group) => !group.archivedAt)
  const primary = totals[0]

  return (
    <>
      <PageHeader
        title={viewerName ? `Namaste, ${viewerName.split(" ")[0]}` : "Your balances"}
        description="Everything you owe and everything you are owed, across every group."
        actions={
          <Button asChild size="sm">
            <Link href="/groups/new">
              <Plus data-icon="inline-start" />
              New group
            </Link>
          </Button>
        }
      />

      {/* The headline number first: most visits are to answer "am I up or down?" */}
      <section className="rounded-2xl border bg-card p-5 md:p-6">
        {primary ? (
          <>
            <p className="text-sm text-muted-foreground">
              {primary.netMinor > 0
                ? "Overall, you are owed"
                : primary.netMinor < 0
                  ? "Overall, you owe"
                  : "You are all settled up"}
            </p>
            <BalanceAmount
              minor={primary.netMinor}
              currency={primary.currency}
              size="xl"
              className="mt-1 block"
            />
            {/* The two halves of the headline figure, given equal weight so
                the split between them is readable at a glance. */}
            <div className="mt-5 grid grid-cols-2 divide-x border-t">
              <div className="pt-4 pr-4">
                <p className="text-xs text-muted-foreground">You are owed</p>
                <Money
                  minor={primary.owedToMe}
                  currency={primary.currency}
                  className="mt-0.5 block text-lg font-semibold text-positive"
                />
              </div>
              <div className="pt-4 pl-4">
                <p className="text-xs text-muted-foreground">You owe</p>
                <Money
                  minor={primary.iOwe}
                  currency={primary.currency}
                  className="mt-0.5 block text-lg font-semibold text-negative"
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing to settle yet. Add an expense to get started.
          </p>
        )}

        {totals.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
            {/* Currencies are never added together — each one keeps its own line. */}
            {totals.slice(1).map((total) => (
              <span
                key={total.currency}
                className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground"
              >
                {total.currency}{" "}
                <BalanceAmount
                  minor={total.netMinor}
                  currency={total.currency}
                  size="sm"
                />
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-8">
        <SectionHeading>By group</SectionHeading>

        {active.length === 0 ? (
          <Empty className="rounded-2xl border border-dashed">
            <EmptyHeader>
              <EmptyTitle>No groups yet</EmptyTitle>
              <EmptyDescription>
                Create one for your flat, your next trip, or just you and a
                friend.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild size="sm">
                <Link href="/groups/new">Create a group</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {active.map((group, index) => (
              <li key={group.id} style={{ "--stagger": index } as React.CSSProperties}>
                <Link
                  href={`/groups/${group.id}`}
                  className="animate-row-in group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/60"
                >
                  <GroupMark
                    name={group.name}
                    colorKey={group.colorKey}
                    id={group.id}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {group.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {group.netMinor > 0
                        ? "you are owed"
                        : group.netMinor < 0
                          ? "you owe"
                          : "settled up"}
                    </span>
                  </span>
                  <BalancePill minor={group.netMinor} currency={group.currency} />
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
