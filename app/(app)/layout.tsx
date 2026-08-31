import { AppShell } from "@/components/shell/app-shell"
import { countUnreadNotifications } from "@/server/queries/activity"
import { listGroupsForUser } from "@/server/queries/group"

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
          emoji: group.emoji,
        }))}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  )
}
