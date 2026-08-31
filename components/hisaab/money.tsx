import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"

/// The only place an amount becomes text. Everything else passes minor units
/// around, which is what keeps the arithmetic exact.
export function Money({
  minor,
  currency = "INR",
  signed = false,
  compact = false,
  className,
}: {
  minor: number
  currency?: string
  signed?: boolean
  compact?: boolean
  className?: string
}) {
  return (
    <span data-slot="money" className={cn("tabular", className)}>
      {formatMoney(minor, currency, { signed, compact })}
    </span>
  )
}

/// A balance with its meaning built in: colour and wording follow the sign, so
/// a member never has to work out which direction a number points.
export function BalanceAmount({
  minor,
  currency = "INR",
  size = "md",
  className,
}: {
  minor: number
  currency?: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}) {
  const tone =
    minor > 0 ? "text-positive" : minor < 0 ? "text-negative" : "text-settled"

  return (
    <span
      data-slot="money"
      className={cn(
        // Inter, not the display serif: figures need tabular widths so a
        // column of balances lines up.
        "tabular font-sans font-semibold",
        tone,
        size === "sm" && "text-sm",
        size === "md" && "text-base",
        size === "lg" && "text-2xl tracking-tight",
        size === "xl" && "text-4xl tracking-tight",
        className
      )}
    >
      {formatMoney(Math.abs(minor), currency)}
    </span>
  )
}

export function balanceLabel(minor: number) {
  if (minor > 0) return "you are owed"
  if (minor < 0) return "you owe"
  return "all settled"
}

/// A compact pill for list rows, where the sign has to read at a glance.
export function BalancePill({
  minor,
  currency = "INR",
  className,
}: {
  minor: number
  currency?: string
  className?: string
}) {
  const tone =
    minor > 0
      ? "bg-positive-soft text-positive"
      : minor < 0
        ? "bg-negative-soft text-negative"
        : "bg-settled-soft text-settled"

  return (
    <span
      data-slot="money"
      className={cn(
        "tabular inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone,
        className
      )}
    >
      {minor === 0 ? "settled" : formatMoney(Math.abs(minor), currency)}
    </span>
  )
}
