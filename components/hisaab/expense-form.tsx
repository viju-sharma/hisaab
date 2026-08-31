"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"

import { CategoryIcon } from "@/components/hisaab/category-icon"
import { MemberAvatar } from "@/components/hisaab/member-avatar"
import { Money } from "@/components/hisaab/money"
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
import { Textarea } from "@/components/ui/textarea"
import { CURRENCIES, currencySymbol } from "@/lib/currency"
import { formatMoney, minorToMajor, parseAmountToMinor } from "@/lib/money"
import { SplitError, computeSplits } from "@/lib/split"
import { cn } from "@/lib/utils"
import { createExpense, updateExpense } from "@/server/actions/expense"

type Member = { userId: string; name: string; imageUrl: string | null }
type Category = { id: string; key: string; label: string; emoji: string }

const METHODS = [
  { value: "EQUAL", label: "Equally", hint: "Split evenly between everyone selected" },
  { value: "EXACT", label: "Exact", hint: "Type what each person owes" },
  { value: "PERCENT", label: "Percent", hint: "Split by share of the total" },
  { value: "SHARES", label: "Shares", hint: "Two shares for one person, one for another" },
] as const

type Method = (typeof METHODS)[number]["value"]

export type ExpenseFormValues = {
  expenseId?: string
  description: string
  notes: string
  categoryId: string | null
  currency: string
  amountMinor: number
  date: Date
  splitMethod: Method
  payers: { userId: string; amountMinor: number }[]
  splits: { userId: string; amountMinor: number; weight: number | null; percentBp: number | null }[]
}

export function ExpenseForm({
  groupId,
  groupCurrency,
  members,
  categories,
  viewerId,
  initial,
}: {
  groupId: string
  groupCurrency: string
  members: Member[]
  categories: Category[]
  viewerId: string
  initial?: ExpenseFormValues
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [description, setDescription] = useState(initial?.description ?? "")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "")
  const [currency, setCurrency] = useState(initial?.currency ?? groupCurrency)
  const [rate, setRate] = useState("1")
  const [date, setDate] = useState(
    format(initial?.date ?? new Date(), "yyyy-MM-dd")
  )
  const [amountText, setAmountText] = useState(
    initial ? String(minorToMajor(initial.amountMinor, initial.currency)) : ""
  )

  const [multiPayer, setMultiPayer] = useState((initial?.payers.length ?? 1) > 1)
  const [singlePayer, setSinglePayer] = useState(
    initial?.payers[0]?.userId ?? viewerId
  )
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (initial?.payers ?? []).map((payer) => [
        payer.userId,
        String(minorToMajor(payer.amountMinor, initial!.currency)),
      ])
    )
  )

  const [method, setMethod] = useState<Method>(initial?.splitMethod ?? "EQUAL")
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        initial?.splits.map((split) => split.userId) ??
          members.map((member) => member.userId)
      )
  )
  const [exact, setExact] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (initial?.splits ?? []).map((split) => [
        split.userId,
        String(minorToMajor(split.amountMinor, initial!.currency)),
      ])
    )
  )
  const [percent, setPercent] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (initial?.splits ?? [])
        .filter((split) => split.percentBp != null)
        .map((split) => [split.userId, String(split.percentBp! / 100)])
    )
  )
  const [shares, setShares] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      (initial?.splits ?? []).map((split) => [split.userId, split.weight ?? 1])
    )
  )

  const amountMinor = parseAmountToMinor(amountText || "0", currency) ?? 0
  const foreign = currency !== groupCurrency

  const payers = useMemo(() => {
    if (!multiPayer) {
      return [{ userId: singlePayer, amountMinor }]
    }
    return members
      .map((member) => ({
        userId: member.userId,
        amountMinor:
          parseAmountToMinor(payerAmounts[member.userId] || "0", currency) ?? 0,
      }))
      .filter((payer) => payer.amountMinor > 0)
  }, [multiPayer, singlePayer, amountMinor, members, payerAmounts, currency])

  const paidTotal = payers.reduce((sum, payer) => sum + payer.amountMinor, 0)

  /// The split is previewed with the same function the server uses, so the
  /// figures on screen are the figures that get stored — including how the
  /// leftover paisa is handed out.
  const preview = useMemo(() => {
    if (amountMinor <= 0) return { splits: [], error: null as string | null }
    try {
      const participants = members
        .map((member) => member.userId)
        .filter((userId) => selected.has(userId))

      switch (method) {
        case "EQUAL":
          return {
            splits: computeSplits(amountMinor, { method: "EQUAL", participants }, currency),
            error: null,
          }
        case "SHARES":
          return {
            splits: computeSplits(
              amountMinor,
              {
                method: "SHARES",
                shares: participants.map((userId) => ({
                  userId,
                  weight: shares[userId] ?? 1,
                })),
              },
              currency
            ),
            error: null,
          }
        case "PERCENT":
          return {
            splits: computeSplits(
              amountMinor,
              {
                method: "PERCENT",
                percents: participants.map((userId) => ({
                  userId,
                  percentBp: Math.round(Number(percent[userId] ?? 0) * 100),
                })),
              },
              currency
            ),
            error: null,
          }
        case "EXACT":
          return {
            splits: computeSplits(
              amountMinor,
              {
                method: "EXACT",
                amounts: participants.map((userId) => ({
                  userId,
                  amountMinor: parseAmountToMinor(exact[userId] || "0", currency) ?? 0,
                })),
              },
              currency
            ),
            error: null,
          }
      }
    } catch (error) {
      return {
        splits: [],
        error: error instanceof SplitError ? error.message : "Check the split.",
      }
    }
  }, [amountMinor, members, selected, method, shares, percent, exact, currency])

  const toggle = (userId: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const splitFor = (userId: string) =>
    preview.splits.find((split) => split.userId === userId)?.amountMinor ?? 0

  const submit = (event: React.FormEvent) => {
    event.preventDefault()

    if (amountMinor <= 0) {
      toast.error("Enter an amount first.")
      return
    }
    if (preview.error) {
      toast.error(preview.error)
      return
    }

    const participants = members
      .map((member) => member.userId)
      .filter((userId) => selected.has(userId))

    const split =
      method === "EQUAL"
        ? { method: "EQUAL" as const, participants }
        : method === "SHARES"
          ? {
              method: "SHARES" as const,
              shares: participants.map((userId) => ({
                userId,
                weight: shares[userId] ?? 1,
              })),
            }
          : method === "PERCENT"
            ? {
                method: "PERCENT" as const,
                percents: participants.map((userId) => ({
                  userId,
                  percentBp: Math.round(Number(percent[userId] ?? 0) * 100),
                })),
              }
            : {
                method: "EXACT" as const,
                amounts: participants.map((userId) => ({
                  userId,
                  amountMinor: parseAmountToMinor(exact[userId] || "0", currency) ?? 0,
                })),
              }

    const payload = {
      groupId,
      description,
      notes,
      categoryId: categoryId || null,
      currency,
      amountMinor,
      exchangeRate: foreign ? Number(rate) || 1 : 1,
      date: new Date(date),
      payers,
      split,
    }

    startTransition(async () => {
      const result = initial?.expenseId
        ? await updateExpense({ ...payload, expenseId: initial.expenseId })
        : await createExpense(payload)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(initial ? "Expense updated." : "Expense added.")
      router.push(`/groups/${groupId}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-7 pb-8">
      {/* The amount comes first and stays big: it is the one field nobody skips. */}
      <div className="rounded-2xl border bg-card p-5">
        <Label htmlFor="amount" className="text-xs text-muted-foreground">
          Amount
        </Label>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-sans text-3xl font-semibold text-muted-foreground">
            {currencySymbol(currency)}
          </span>
          <input
            id="amount"
            value={amountText}
            onChange={(event) => setAmountText(event.target.value)}
            inputMode="decimal"
            autoFocus
            placeholder="0"
            className="tabular w-full bg-transparent font-sans text-4xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/40"
          />
        </div>

        <div className="mt-4 flex items-center gap-2 border-t pt-3">
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger size="sm" className="w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((option) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.symbol} {option.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-8 w-auto"
          />
        </div>

        {foreign ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
            <span className="text-muted-foreground">
              1 {currency} = {groupCurrency}
            </span>
            <Input
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              inputMode="decimal"
              className="h-7 w-24"
            />
            <span className="text-muted-foreground">
              {/* The rate is stored with the expense, so this balance never
                  moves again when the market does. */}
              locked in at today&apos;s rate
            </span>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">What was it for?</Label>
        <Input
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Dinner at Britannia"
        />
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {categories.map((category) => (
            <button
                key={category.id}
                type="button"
                onClick={() =>
                  setCategoryId((current) =>
                    current === category.id ? "" : category.id
                  )
                }
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-[0.2rem] border px-2.5 py-1.5 text-sm transition-colors",
                  categoryId === category.id
                    ? "border-foreground bg-foreground text-background"
                    : "text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
              >
              <CategoryIcon categoryKey={category.key} className="size-3.5" />
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Paid by</Label>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setMultiPayer((current) => !current)}
          >
            {multiPayer ? "One person paid" : "More than one person paid"}
          </Button>
        </div>

        {multiPayer ? (
          <>
            <ul className="divide-y overflow-hidden rounded-xl border">
              {members.map((member) => (
                <li key={member.userId} className="flex items-center gap-3 px-3 py-2.5">
                  <MemberAvatar member={member} />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {member.name}
                    {member.userId === viewerId ? " (you)" : ""}
                  </span>
                  <Input
                    value={payerAmounts[member.userId] ?? ""}
                    onChange={(event) =>
                      setPayerAmounts((current) => ({
                        ...current,
                        [member.userId]: event.target.value,
                      }))
                    }
                    inputMode="decimal"
                    placeholder="0"
                    className="tabular h-8 w-24 text-right"
                  />
                </li>
              ))}
            </ul>
            <p
              className={cn(
                "text-xs",
                paidTotal === amountMinor
                  ? "text-muted-foreground"
                  : "text-negative"
              )}
            >
              {paidTotal === amountMinor
                ? "Payers add up to the total."
                : `${formatMoney(Math.abs(amountMinor - paidTotal), currency)} ${
                    paidTotal < amountMinor ? "still unaccounted for" : "over the total"
                  }.`}
            </p>
          </>
        ) : (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {members.map((member) => (
              <button
                key={member.userId}
                type="button"
                onClick={() => setSinglePayer(member.userId)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-sm transition-all active:translate-y-px",
                  singlePayer === member.userId
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <MemberAvatar member={member} className="size-6" />
                {member.userId === viewerId ? "You" : member.name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <Label>Split</Label>

        <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
          {METHODS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMethod(option.value)}
              className={cn(
                "rounded-lg px-2 py-1.5 text-xs font-medium transition-all",
                method === option.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {METHODS.find((option) => option.value === method)!.hint}
        </p>

        <ul className="divide-y overflow-hidden rounded-xl border">
          {members.map((member) => {
            const included = selected.has(member.userId)
            return (
              <li
                key={member.userId}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 transition-opacity",
                  !included && "opacity-45"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(member.userId)}
                  aria-pressed={included}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <MemberAvatar member={member} />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {member.name}
                    {member.userId === viewerId ? " (you)" : ""}
                  </span>
                </button>

                {included && method === "EXACT" ? (
                  <Input
                    value={exact[member.userId] ?? ""}
                    onChange={(event) =>
                      setExact((current) => ({
                        ...current,
                        [member.userId]: event.target.value,
                      }))
                    }
                    inputMode="decimal"
                    placeholder="0"
                    className="tabular h-8 w-24 text-right"
                  />
                ) : null}

                {included && method === "PERCENT" ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={percent[member.userId] ?? ""}
                      onChange={(event) =>
                        setPercent((current) => ({
                          ...current,
                          [member.userId]: event.target.value,
                        }))
                      }
                      inputMode="decimal"
                      placeholder="0"
                      className="tabular h-8 w-16 text-right"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                ) : null}

                {included && method === "SHARES" ? (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      onClick={() =>
                        setShares((current) => ({
                          ...current,
                          [member.userId]: Math.max(
                            0,
                            (current[member.userId] ?? 1) - 1
                          ),
                        }))
                      }
                    >
                      −
                    </Button>
                    <span className="tabular w-6 text-center text-sm">
                      {shares[member.userId] ?? 1}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      onClick={() =>
                        setShares((current) => ({
                          ...current,
                          [member.userId]: (current[member.userId] ?? 1) + 1,
                        }))
                      }
                    >
                      +
                    </Button>
                  </div>
                ) : null}

                {included ? (
                  <span className="tabular w-20 text-right text-sm font-medium">
                    <Money minor={splitFor(member.userId)} currency={currency} />
                  </span>
                ) : (
                  <span className="w-20 text-right text-xs text-muted-foreground">
                    not in
                  </span>
                )}
              </li>
            )
          })}
        </ul>

        {preview.error ? (
          <p className="text-xs text-negative">{preview.error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {selected.size} {selected.size === 1 ? "person" : "people"} ·{" "}
            {formatMoney(amountMinor, currency)} accounted for exactly.
          </p>
        )}
      </section>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
        />
      </div>

      <div className="sticky bottom-20 z-10 md:bottom-4">
        <Button
          type="submit"
          size="lg"
          className="w-full shadow-lg"
          disabled={pending || amountMinor <= 0 || Boolean(preview.error)}
        >
          {pending
            ? "Saving…"
            : initial
              ? "Save changes"
              : `Add ${amountMinor > 0 ? formatMoney(amountMinor, currency) : "expense"}`}
        </Button>
      </div>
    </form>
  )
}
