import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-3 pt-6 pb-6 md:pt-0",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="font-display text-[1.9rem] leading-[1.1] text-balance md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground text-pretty">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
