"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { HandCoins } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { minorToMajor, parseAmountToMinor } from "@/lib/money"
import { recordSettlement } from "@/server/actions/settlement"

const METHODS = [
  { value: "UPI", label: "UPI" },
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Something else" },
] as const

/// Records a payment that already happened in the real world — Hisaab does not
/// move money, it remembers that money moved.
export function SettleUpButton({
  groupId,
  currency,
  fromUserId,
  toUserId,
  fromName,
  toName,
  suggestedMinor,
}: {
  groupId: string
  currency: string
  fromUserId: string
  toUserId: string
  fromName: string
  toName: string
  suggestedMinor: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [amount, setAmount] = useState(
    String(minorToMajor(suggestedMinor, currency))
  )
  const [method, setMethod] = useState<(typeof METHODS)[number]["value"]>("UPI")
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [note, setNote] = useState("")

  const submit = () => {
    const amountMinor = parseAmountToMinor(amount, currency)
    if (!amountMinor || amountMinor <= 0) {
      toast.error("Enter an amount greater than zero.")
      return
    }

    startTransition(async () => {
      const result = await recordSettlement({
        groupId,
        fromUserId,
        toUserId,
        amountMinor,
        currency,
        exchangeRate: 1,
        date: new Date(date),
        method,
        note,
      })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      setOpen(false)
      toast.success("Payment recorded.")
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="xs" aria-label="Record this payment">
          <HandCoins data-icon="inline-start" />
          Settle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            {fromName} paid {toName}. This only records what already happened —
            no money moves here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settle-amount">Amount</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {currencySymbol(currency)}
              </span>
              <Input
                id="settle-amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                className="tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="settle-method">How</Label>
              <Select
                value={method}
                onValueChange={(value) =>
                  setMethod(value as (typeof METHODS)[number]["value"])
                }
              >
                <SelectTrigger id="settle-method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settle-date">When</Label>
              <Input
                id="settle-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settle-note">Note (optional)</Label>
            <Input
              id="settle-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Sent on UPI"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Recording…" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
