import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { BalancePill } from "@/components/hisaab/money"
import { MemberStack } from "@/components/hisaab/member-avatar"
import { PageHeader } from "@/components/hisaab/page-header"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { listGroupsForUser } from "@/server/queries/group"

export const metadata: Metadata = { title: "Groups" }

export default async function GroupsPage() {
  const groups = await listGroupsForUser()
  const active = groups.filter((group) => !group.archivedAt)
  const archived = groups.filter((group) => group.archivedAt)

  return (
    <>
      <PageHeader
        title="Groups"
        description="Every shared ledger you are part of."
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href="/join">Join</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/groups/new">
                <Plus data-icon="inline-start" />
                New
              </Link>
            </Button>
          </>
        }
      />

      {active.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Nothing shared yet</EmptyTitle>
            <EmptyDescription>
              Create a group, then share the code or link with whoever is
              splitting with you.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row gap-2">
            <Button asChild size="sm">
              <Link href="/groups/new">Create a group</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/join">I have a code</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {active.map((group, index) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              style={{ "--stagger": index } as React.CSSProperties}
              className="animate-row-in group flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm active:translate-y-px"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl" aria-hidden>
                  {group.emoji}
                </span>
                <BalancePill minor={group.myNetMinor} currency={group.currency} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display font-medium">{group.name}</p>
                <p className="text-xs text-muted-foreground">
                  {group.members.length}{" "}
                  {group.members.length === 1 ? "member" : "members"} ·{" "}
                  {group.expenseCount}{" "}
                  {group.expenseCount === 1 ? "expense" : "expenses"}
                </p>
              </div>
              <MemberStack members={group.members} />
            </Link>
          ))}
        </div>
      )}

      {archived.length > 0 ? (
        <section className="mt-10">
          <h2 className="pb-3 text-sm font-medium text-muted-foreground">
            Archived
          </h2>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {archived.map((group) => (
              <li key={group.id}>
                <Link
                  href={`/groups/${group.id}`}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60"
                >
                  <span aria-hidden>{group.emoji}</span>
                  <span className="truncate">{group.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
