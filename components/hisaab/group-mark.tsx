import { groupColorFor, groupMonogram } from "@/lib/group-colors"
import { cn } from "@/lib/utils"

/// A group's identity: two letters on a flat colour. Replaces the emoji tile,
/// which read as decoration rather than as a label and never scanned well in a
/// column of similar-looking rows.
export function GroupMark({
  name,
  colorKey,
  id,
  className,
}: {
  name: string
  colorKey?: string | null
  id: string
  className?: string
}) {
  const color = groupColorFor(colorKey, id)

  return (
    <span
      aria-hidden
      style={{ background: color.bg, color: color.fg }}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-[0.2rem] text-[0.7rem] font-semibold tracking-[0.02em] tabular-nums",
        className
      )}
    >
      {groupMonogram(name)}
    </span>
  )
}
