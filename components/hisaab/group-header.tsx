"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Settings } from "lucide-react"

import { BalanceAmount, balanceLabel } from "@/components/hisaab/money"
import { MemberStack } from "@/components/hisaab/member-avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Group = {
  id: string
  name: string
  emoji: string
  currency: string
  archivedAt: Date | null
  members: { userId: string; name: string; imageUrl: string | null }[]
}

/// Sticky on mobile: scrolling a long expense list should never lose sight of
/// what you owe, since that is the number the screen exists to answer.
export function GroupHeader({
  group,
  myNetMinor,
}: {
  group: Group
  myNetMinor: number
}) {
  const pathname = usePathname()
  const base = `/groups/${group.id}`

  const tabs = [
    { href: base, label: "Expenses" },
    { href: `${base}/balances`, label: "Balances" },
    { href: `${base}/recurring`, label: "Recurring" },
    { href: `${base}/activity`, label: "Activity" },
  ]

  return (
    <div className="sticky top-12 z-20 -mx-4 mb-5 border-b bg-background/90 px-4 pt-4 backdrop-blur-md md:static md:top-auto md:mx-0 md:bg-transparent md:px-0 md:pt-0 md:backdrop-blur-none">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-2xl" aria-hidden>
            {group.emoji}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl tracking-tight">
              {group.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              {balanceLabel(myNetMinor)}{" "}
              <BalanceAmount
                minor={myNetMinor}
                currency={group.currency}
                size="sm"
              />
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <MemberStack members={group.members} className="hidden sm:flex" />
          <Button asChild variant="ghost" size="icon-sm" aria-label="Group settings">
            <Link href={`${base}/settings`}>
              <Settings />
            </Link>
          </Button>
        </div>
      </div>

      {group.archivedAt ? (
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          This group is archived. It is read-only.
        </p>
      ) : null}

      <nav className="-mx-1 mt-3 flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active =
            tab.href === base ? pathname === base : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative shrink-0 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {active ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
