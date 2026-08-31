import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

const ROWS = [
  { emoji: "🏠", label: "Rent — March", meta: "You paid ₹66,000", impact: "+₹44,000", up: true },
  { emoji: "💡", label: "Electricity + water", meta: "Biju paid ₹4,280", impact: "−₹1,427", up: false },
  { emoji: "🛒", label: "Big Basket run", meta: "Chandra paid ₹3,124", impact: "−₹1,041", up: false },
  { emoji: "📶", label: "Wifi — Airtel", meta: "You paid ₹1,199", impact: "+₹800", up: true },
]

/// A still of the real interface, built from the same tokens as the app itself —
/// so the landing page cannot drift into promising a product that does not look
/// like this. Decorative: hidden from assistive technology, since the copy
/// beside it already says everything.
export function AppPreview({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative select-none", className)}>
      {/* A soft wash behind the card, so it sits in light rather than on a
          blank field. */}
      <div className="absolute -inset-x-10 -inset-y-8 -z-10 rounded-[3rem] bg-[radial-gradient(60%_60%_at_60%_35%,var(--color-accent),transparent_75%)] opacity-70 blur-2xl" />

      <div className="rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(20,18,16,0.04),0_12px_32px_-12px_rgba(20,18,16,0.14)]">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-lg">🏠</span>
          <span className="font-medium">Bandra flat</span>
          <span className="ml-auto rounded-full bg-positive-soft px-2 py-0.5 text-xs font-medium text-positive">
            3 members
          </span>
        </div>

        <p className="mt-5 text-xs text-muted-foreground">Overall, you are owed</p>
        <p className="tabular mt-0.5 text-4xl font-semibold tracking-tight text-positive">
          ₹42,332
        </p>

        <div className="mt-5 space-y-px border-t pt-4">
          {ROWS.map((row) => (
            <div key={row.label} className="flex items-center gap-3 py-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm">
                {row.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {row.label}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {row.meta}
                </span>
              </span>
              <span
                className={cn(
                  "tabular shrink-0 text-sm font-medium",
                  row.up ? "text-positive" : "text-negative"
                )}
              >
                {row.impact}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Offset so the composition has a foreground and a background rather
          than one flat rectangle. */}
      <div className="absolute -right-4 -bottom-6 flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 shadow-[0_1px_2px_rgba(20,18,16,0.04),0_10px_24px_-10px_rgba(20,18,16,0.18)] sm:-right-8">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ArrowRight className="size-3.5" />
        </span>
        <span className="text-xs">
          <span className="block font-medium">Settle in 2 payments</span>
          <span className="block text-muted-foreground">instead of 6</span>
        </span>
      </div>
    </div>
  )
}
