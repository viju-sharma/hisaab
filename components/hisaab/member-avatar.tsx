import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export type MemberLike = {
  userId: string
  name: string
  imageUrl?: string | null
}

function initials(name: string, max = 2) {
  return name
    .split(/\s+/)
    .slice(0, max)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function MemberAvatar({
  member,
  className,
  /// Overlapping avatars hide their own right edge, so a stack asks for one
  /// letter rather than two it would only clip.
  letters = 2,
}: {
  member: MemberLike
  className?: string
  letters?: 1 | 2
}) {
  return (
    <Avatar className={cn("size-7", className)}>
      {member.imageUrl ? (
        <AvatarImage src={member.imageUrl} alt={member.name} />
      ) : null}
      <AvatarFallback className="text-[0.7rem] font-medium">
        {initials(member.name, letters) || "?"}
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
          letters={1}
          className="size-7 ring-2 ring-background"
        />
      ))}
      {overflow > 0 ? (
        <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[0.65rem] font-medium text-muted-foreground ring-2 ring-background">
          +{overflow}
        </span>
      ) : null}
    </div>
  )
}
