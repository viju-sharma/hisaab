import { formatDistanceToNow } from "date-fns"

import { MemberAvatar } from "@/components/hisaab/member-avatar"
import { listGroupActivity } from "@/server/queries/activity"

export default async function GroupActivityPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const activity = await listGroupActivity(groupId)

  if (activity.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        Nothing has happened in this group yet.
      </p>
    )
  }

  return (
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
              <span className="font-medium">{entry.actor.name ?? "Someone"}</span>{" "}
              <span className="text-muted-foreground">{entry.summary}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
