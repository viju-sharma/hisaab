"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { Plus } from "lucide-react"

import { HisaabLogo } from "@/components/brand/logo"
import { NewExpenseButton } from "@/components/hisaab/new-expense-button"
import { NAV_ITEMS } from "@/components/shell/nav"
import { cn } from "@/lib/utils"

export type ShellGroup = {
  id: string
  name: string
  emoji: string
}

/// One shell, two shapes: a persistent rail from `md` up, a top bar plus a
/// thumb-reachable tab bar below it. Both render the same nav definition, so a
/// new destination only has to be added once.
export function AppShell({
  groups,
  unreadCount,
  children,
}: {
  groups: ShellGroup[]
  unreadCount: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="sticky top-0 z-30 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-4 md:flex">
        <Link href="/dashboard" className="px-2 py-1">
          <HisaabLogo />
        </Link>

        <nav className="mt-6 flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
              {item.href === "/notifications" && unreadCount > 0 ? (
                <span className="ml-auto rounded-full bg-primary px-1.5 py-px text-[0.65rem] font-semibold text-primary-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
          <p className="px-2.5 pb-1 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
            Your groups
          </p>
          <div className="flex flex-col gap-0.5">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                  pathname.startsWith(`/groups/${group.id}`)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <span aria-hidden>{group.emoji}</span>
                <span className="truncate">{group.name}</span>
              </Link>
            ))}
            {groups.length === 0 ? (
              <p className="px-2.5 py-1.5 text-sm text-muted-foreground">
                No groups yet.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <UserButton />
          <NewExpenseButton groups={groups} />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-2.5 backdrop-blur-md md:hidden pt-safe">
        <Link href="/dashboard">
          <HisaabLogo />
        </Link>
        <UserButton />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 md:px-8 md:pt-8 md:pb-16">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur-md md:hidden pb-safe">
        <div className="mx-auto flex max-w-md items-end justify-around px-2 pt-1.5">
          {NAV_ITEMS.filter((item) => item.primary)
            .slice(0, 2)
            .map((item) => (
              <TabLink key={item.href} item={item} active={isActive(item.href)} />
            ))}

          <NewExpenseButton groups={groups}>
            <span className="flex size-12 -translate-y-3 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95">
              <Plus className="size-6" />
              <span className="sr-only">Add an expense</span>
            </span>
          </NewExpenseButton>

          {NAV_ITEMS.filter((item) => item.primary)
            .slice(2)
            .map((item) => (
              <TabLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                badge={item.href === "/notifications" ? unreadCount : 0}
              />
            ))}
        </div>
      </nav>
    </div>
  )
}

function TabLink({
  item,
  active,
  badge = 0,
}: {
  item: (typeof NAV_ITEMS)[number]
  active: boolean
  badge?: number
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-w-14 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[0.65rem] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <item.icon className={cn("size-5 transition-transform", active && "scale-110")} />
      {item.label}
      {badge > 0 ? (
        <span className="absolute top-0.5 right-2 size-2 rounded-full bg-primary" />
      ) : null}
    </Link>
  )
}
