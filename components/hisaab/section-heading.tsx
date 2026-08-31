import { cn } from "@/lib/utils"

/// One heading style for every section in the app. Before this the same idea
/// was written three ways on three screens, which read as three different
/// hierarchies rather than one.
export function SectionHeading({
  children,
  actions,
  className,
}: {
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 pb-2.5", className)}>
      <h2 className="text-xs font-medium tracking-[0.06em] text-muted-foreground uppercase">
        {children}
      </h2>
      {actions}
    </div>
  )
}
