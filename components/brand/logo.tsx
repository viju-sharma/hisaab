import { cn } from "@/lib/utils"

/// The Hisaab mark: a shirorekha — the headline rule that runs above Devanagari
/// letters, which is also the rule at the top of a ledger page — with three
/// entries of unequal length hanging from it. One bill, uneven shares, one
/// shared total. Drawn in `currentColor` so it inherits from context and works
/// as a monochrome and maskable icon without a second asset.
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
      <rect x="9" y="13" width="46" height="7" rx="3.5" fill="currentColor" />
      <rect x="11.5" y="20" width="9" height="31" rx="4.5" fill="currentColor" />
      <rect x="27.5" y="20" width="9" height="21" rx="4.5" fill="currentColor" />
      <rect x="43.5" y="20" width="9" height="27" rx="4.5" fill="currentColor" />
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
      <span className="flex size-8 items-center justify-center rounded-[0.55rem] bg-primary text-primary-foreground">
        <HisaabMark className="size-5" />
      </span>
      {showWordmark ? (
        <span className="font-display text-[1.0625rem] leading-none font-semibold tracking-tight">
          Hisaab
        </span>
      ) : null}
    </span>
  )
}
