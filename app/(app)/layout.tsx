import type { Metadata } from "next"

import { AppShell } from "@/components/shell/app-shell"
import { countUnreadNotifications } from "@/server/queries/activity"
import { listGroupsForUser } from "@/server/queries/group"

/// One declaration for the whole signed-in app. A crawler is redirected to
/// sign-in before it ever renders these, but the header costs nothing and
/// covers the case where that redirect is not what happens.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [groups, unreadCount] = await Promise.all([
    listGroupsForUser(),
    countUnreadNotifications(),
  ])

  return (
    <AppShell
      groups={groups
        .filter((group) => !group.archivedAt)
        .map((group) => ({
          id: group.id,
          name: group.name,
          colorKey: group.colorKey,
        }))}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  )
}
