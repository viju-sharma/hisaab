"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { CURRENCIES } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { createGroup } from "@/server/actions/group"

/// A short, opinionated set. Picking a type sets a sensible emoji, so most
/// people never touch the emoji row at all.
const TYPES = [
  { value: "HOME", label: "Flat / home", emoji: "🏠" },
  { value: "TRIP", label: "Trip", emoji: "✈️" },
  { value: "COUPLE", label: "Couple", emoji: "💞" },
  { value: "EVENT", label: "Event", emoji: "🎉" },
  { value: "PROJECT", label: "Project", emoji: "📁" },
  { value: "OTHER", label: "Something else", emoji: "🧾" },
] as const

const EMOJIS = ["🧾", "🏠", "✈️", "💞", "🎉", "📁", "🍛", "🏖️", "🚗", "🎓"]

export function GroupForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("HOME")
  const [emoji, setEmoji] = useState("🏠")
  const [currency, setCurrency] = useState("INR")
  const [simplifyDebts, setSimplifyDebts] = useState(true)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setErrors({})

    startTransition(async () => {
      const result = await createGroup({
        name,
        description,
        type,
        emoji,
        colorKey: "indigo",
        currency,
        simplifyDebts,
      })

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
        return
      }

      toast.success(`${name} is ready — share the code to add people.`)
      router.push(`/groups/${result.data.groupId}`)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Group name</Label>
        <div className="flex gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted text-lg">
            {emoji}
          </span>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bandra flat"
            autoFocus
            aria-invalid={Boolean(errors.name)}
          />
        </div>
        {errors.name ? (
          <p className="text-xs text-destructive">{errors.name[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>What is it for?</Label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setType(option.value)
                setEmoji(option.emoji)
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-all active:translate-y-px",
                type === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <span aria-hidden className="mr-1">
                {option.emoji}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Icon</Label>
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setEmoji(option)}
              aria-pressed={emoji === option}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg border text-lg transition-all active:translate-y-px",
                emoji === option ? "border-primary bg-primary/10" : "hover:bg-muted"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">Currency</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger id="currency" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((option) => (
              <SelectItem key={option.code} value={option.code}>
                {option.symbol} {option.code} · {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Balances are shown in this currency. Individual expenses can still be
          entered in another one.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Note (optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Rent, bills and groceries for the flat"
          rows={2}
        />
      </div>

      <label className="flex items-start justify-between gap-4 rounded-xl border p-4">
        <span className="space-y-1">
          <span className="block text-sm font-medium">Simplify debts</span>
          <span className="block text-xs text-muted-foreground">
            Collapse the group into the fewest possible payments instead of
            settling every pair separately.
          </span>
        </span>
        <Switch checked={simplifyDebts} onCheckedChange={setSimplifyDebts} />
      </label>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create group"}
      </Button>
    </form>
  )
}
