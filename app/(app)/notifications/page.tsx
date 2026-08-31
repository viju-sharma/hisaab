import type { Metadata } from "next"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

import { MarkAllReadButton } from "@/components/hisaab/mark-all-read"
import { PageHeader } from "@/components/hisaab/page-header"
import { cn } from "@/lib/utils"
import { listNotifications } from "@/server/queries/activity"

export const metadata: Metadata = { title: "Alerts" }

export default async function NotificationsPage() {
  const { notifications, unreadCount } = await listNotifications()

  return (
    <>
      <PageHeader
        title="Alerts"
        description={
          unreadCount > 0
            ? `${unreadCount} unread`
            : "You are all caught up."
        }
        actions={unreadCount > 0 ? <MarkAllReadButton /> : null}
      />

      {notifications.length === 0 ? (
        <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing here yet.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {notifications.map((notification, index) => {
            const body = (
              <div className="flex items-start gap-3 px-4 py-3">
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    notification.readAt ? "bg-transparent" : "bg-primary"
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm",
                      notification.readAt
                        ? "text-muted-foreground"
                        : "font-medium"
                    )}
                  >
                    {notification.title}
                  </p>
                  {notification.body ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {notification.body}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(notification.createdAt, {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            )

            return (
              <li
                key={notification.id}
                style={{ "--stagger": index } as React.CSSProperties}
                className="animate-row-in"
              >
                {notification.href ? (
                  <Link
                    href={notification.href}
                    className="block transition-colors hover:bg-muted/60"
                  >
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
