import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export type MemberLike = {
  userId: string
  name: string
  imageUrl?: string | null
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function MemberAvatar({
  member,
  className,
}: {
  member: MemberLike
  className?: string
}) {
  return (
    <Avatar className={cn("size-7", className)}>
      {member.imageUrl ? (
        <AvatarImage src={member.imageUrl} alt={member.name} />
      ) : null}
      <AvatarFallback className="text-[0.65rem] font-medium">
        {initials(member.name) || "?"}
      </AvatarFallback>
    </Avatar>
  )
}

/// Overlapping avatars with a "+n" tail — enough to recognise a group at a
/// glance without listing everyone.
export function MemberStack({
  members,
  max = 4,
  className,
}: {
  members: MemberLike[]
  max?: number
  className?: string
}) {
  const shown = members.slice(0, max)
  const overflow = members.length - shown.length

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {shown.map((member) => (
        <MemberAvatar
          key={member.userId}
          member={member}
          className="size-6 ring-2 ring-background"
        />
      ))}
      {overflow > 0 ? (
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[0.6rem] font-medium text-muted-foreground ring-2 ring-background">
          +{overflow}
        </span>
      ) : null}
    </div>
  )
}
