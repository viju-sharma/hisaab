import { CategoryIcon } from "@/components/hisaab/category-icon"
import { GroupMark } from "@/components/hisaab/group-mark"
import { cn } from "@/lib/utils"

const ROWS = [
  { key: "rent", label: "Rent — March", meta: "You paid ₹66,000", impact: "+₹44,000", up: true },
  { key: "utilities", label: "Electricity + water", meta: "Biju paid ₹4,280", impact: "−₹1,427", up: false },
  { key: "groceries", label: "Big Basket run", meta: "Chandra paid ₹3,124", impact: "−₹1,041", up: false },
  { key: "internet", label: "Wifi — Airtel", meta: "You paid ₹1,199", impact: "+₹800", up: true },
]

/// A still of the real interface, built from the same tokens as the app — so
/// the landing page cannot drift into promising something that does not exist.
/// Decorative: the copy beside it already says everything, so it is hidden from
/// assistive technology.
export function AppPreview({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("border bg-card", className)}>
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <GroupMark name="Bandra flat" colorKey="ink" id="preview" className="size-8" />
        <span className="flex-1 text-sm font-medium">Bandra flat</span>
        <span className="label-mono text-muted-foreground">3 members</span>
      </div>

      <div className="px-5 py-6">
        <p className="label-mono text-muted-foreground">You are owed</p>
        <p className="tabular mt-1.5 text-[2.75rem] leading-none font-medium tracking-[-0.04em] text-positive">
          ₹42,332
        </p>
      </div>

      <div className="divide-y border-t">
        {ROWS.map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-5 py-3">
            <CategoryIcon
              categoryKey={row.key}
              className="shrink-0 text-muted-foreground"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{row.label}</span>
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

      <div className="flex items-center justify-between gap-3 border-t bg-brand px-5 py-3 text-brand-foreground">
        <span className="text-sm font-medium">Settle in 2 payments</span>
        <span className="label-mono opacity-70">instead of 6</span>
      </div>
    </div>
  )
}
