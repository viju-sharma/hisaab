"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"

import { MemberAvatar } from "@/components/hisaab/member-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { currencySymbol } from "@/lib/currency"
import { parseAmountToMinor } from "@/lib/money"
import { cn } from "@/lib/utils"
import { createRecurring } from "@/server/actions/recurring"

type Member = { userId: string; name: string; imageUrl: string | null }

const FREQUENCIES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "FORTNIGHTLY", label: "Every two weeks" },
  { value: "DAILY", label: "Daily" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
] as const

type Frequency = (typeof FREQUENCIES)[number]["value"]

/// Deliberately narrower than the expense form: recurring charges in practice
/// are rent, wifi and the maid — one payer, split evenly. Anything more
/// intricate is better added by hand each time.
export function RecurringForm({
  groupId,
  groupCurrency,
  members,
  viewerId,
}: {
  groupId: string
  groupCurrency: string
  members: Member[]
  viewerId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [description, setDescription] = useState("")
  const [amountText, setAmountText] = useState("")
  const [frequency, setFrequency] = useState<Frequency>("MONTHLY")
  const [payer, setPayer] = useState(viewerId)
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(members.map((member) => member.userId))
  )

  const submit = (event: React.FormEvent) => {
    event.preventDefault()

    const amountMinor = parseAmountToMinor(amountText, groupCurrency)
    if (!amountMinor || amountMinor <= 0) {
      toast.error("Enter an amount greater than zero.")
      return
    }
    if (selected.size === 0) {
      toast.error("Pick at least one person to split with.")
      return
    }

    const start = new Date(startDate)

    startTransition(async () => {
      const result = await createRecurring({
        groupId,
        description,
        notes: "",
        categoryId: null,
        currency: groupCurrency,
        amountMinor,
        payers: [{ userId: payer, amountMinor }],
        split: { method: "EQUAL", participants: [...selected] },
        frequency,
        interval: 1,
        // Monthly schedules keep the day of the start date, clamped down in
        // short months by lib/recurrence.
        anchorDay:
          frequency === "MONTHLY" ||
          frequency === "QUARTERLY" ||
          frequency === "YEARLY"
            ? start.getDate()
            : null,
        weekday:
          frequency === "WEEKLY" || frequency === "FORTNIGHTLY"
            ? start.getDay()
            : null,
        startDate: start,
        endDate: null,
      })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success("Scheduled. It will be added automatically from now on.")
      setDescription("")
      setAmountText("")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-5">
      <div className="space-y-2">
        <Label htmlFor="recurring-description">What recurs?</Label>
        <Input
          id="recurring-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Rent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="recurring-amount">Amount</Label>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">
              {currencySymbol(groupCurrency)}
            </span>
            <Input
              id="recurring-amount"
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="tabular"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recurring-frequency">How often</Label>
          <Select
            value={frequency}
            onValueChange={(value) => setFrequency(value as Frequency)}
          >
            <SelectTrigger id="recurring-frequency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="recurring-start">Starting</Label>
        <Input
          id="recurring-start"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Paid by</Label>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {members.map((member) => (
            <button
              key={member.userId}
              type="button"
              onClick={() => setPayer(member.userId)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-sm transition-all active:translate-y-px",
                payer === member.userId
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <MemberAvatar member={member} className="size-6" />
              {member.userId === viewerId ? "You" : member.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Split equally between</Label>
        <div className="flex flex-wrap gap-1.5">
          {members.map((member) => (
            <button
              key={member.userId}
              type="button"
              aria-pressed={selected.has(member.userId)}
              onClick={() =>
                setSelected((current) => {
                  const next = new Set(current)
                  if (next.has(member.userId)) next.delete(member.userId)
                  else next.add(member.userId)
                  return next
                })
              }
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-all active:translate-y-px",
                selected.has(member.userId)
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {member.userId === viewerId ? "You" : member.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Scheduling…" : "Schedule it"}
      </Button>
    </form>
  )
}
