import type { Metadata } from "next"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

import { MemberAvatar } from "@/components/hisaab/member-avatar"
import { PageHeader } from "@/components/hisaab/page-header"
import { listPersonalActivity } from "@/server/queries/activity"

export const metadata: Metadata = { title: "Activity" }

export default async function ActivityPage() {
  const activity = await listPersonalActivity()

  return (
    <>
      <PageHeader
        title="Activity"
        description="Everything that has happened across your groups."
      />

      {activity.length === 0 ? (
        <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing yet. Add an expense and it will show up here.
        </p>
      ) : (
        <ol className="space-y-3 pb-8">
          {activity.map((entry, index) => (
            <li
              key={entry.id}
              style={{ "--stagger": index } as React.CSSProperties}
              className="animate-row-in flex gap-3"
            >
              <MemberAvatar
                member={{
                  userId: entry.actor.id,
                  name: entry.actor.name ?? "Someone",
                  imageUrl: entry.actor.imageUrl,
                }}
              />
              <div className="min-w-0 flex-1 border-b pb-3">
                <p className="text-sm">
                  <span className="font-medium">
                    {entry.actor.name ?? "Someone"}
                  </span>{" "}
                  <span className="text-muted-foreground">{entry.summary}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.group ? (
                    <Link
                      href={`/groups/${entry.groupId}`}
                      className="hover:text-foreground hover:underline"
                    >
                      {entry.group.name}
                    </Link>
                  ) : null}
                  {" · "}
                  {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
