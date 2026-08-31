import { cn } from "@/lib/utils"

/// The Hisaab mark: an equals sign whose two bars are not equal. Settling up is
/// the product, and the asymmetry is the reason it needs doing — what looks
/// like an even split almost never is. Drawn in `currentColor` so it inherits
/// from context and works monochrome and maskable without a second asset.
export function HisaabMark({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("size-6", className)}
      {...props}
    >
      <rect x="14" y="21" width="36" height="9" rx="4.5" fill="currentColor" />
      <rect x="14" y="34" width="22" height="9" rx="4.5" fill="currentColor" />
    </svg>
  )
}

export function HisaabLogo({
  className,
  showWordmark = true,
}: {
  className?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex size-7 items-center justify-center rounded-[0.2rem] bg-foreground text-background">
        <HisaabMark className="size-4.5" />
      </span>
      {showWordmark ? (
        <span className="font-display text-[1.05rem] leading-none font-semibold">
          Hisaab
        </span>
      ) : null}
    </span>
  )
}
