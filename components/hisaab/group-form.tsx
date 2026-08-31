"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { GroupMark } from "@/components/hisaab/group-mark"
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
import {
  GROUP_COLORS,
  GROUP_COLOR_KEYS,
  type GroupColorKey,
} from "@/lib/group-colors"
import { cn } from "@/lib/utils"
import { createGroup } from "@/server/actions/group"

const TYPES = [
  { value: "HOME", label: "Flat / home" },
  { value: "TRIP", label: "Trip" },
  { value: "COUPLE", label: "Couple" },
  { value: "EVENT", label: "Event" },
  { value: "PROJECT", label: "Project" },
  { value: "OTHER", label: "Something else" },
] as const

export function GroupForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("HOME")
  const [colorKey, setColorKey] = useState<GroupColorKey>("ink")
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
        colorKey,
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
          <GroupMark
            name={name || "New group"}
            colorKey={colorKey}
            id="preview"
            className="size-9"
          />
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
              onClick={() => setType(option.value)}
              className={cn(
                "rounded-[0.2rem] border px-2.5 py-1.5 text-sm transition-colors",
                type === option.value
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Colour</Label>
        <div className="flex flex-wrap gap-1.5">
          {GROUP_COLOR_KEYS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setColorKey(option)}
              aria-pressed={colorKey === option}
              aria-label={GROUP_COLORS[option].label}
              style={{ background: GROUP_COLORS[option].bg }}
              className={cn(
                "size-7 rounded-[0.2rem] outline-offset-2 transition-all",
                colorKey === option && "outline-2 outline-foreground"
              )}
            />
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
