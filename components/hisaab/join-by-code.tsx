"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { joinGroup } from "@/server/actions/group"

export function JoinByCode({
  initialCode = "",
  autoJoin = false,
}: {
  initialCode?: string
  autoJoin?: boolean
}) {
  const router = useRouter()
  const [code, setCode] = useState(initialCode)
  const [pending, startTransition] = useTransition()
  const [failed, setFailed] = useState<string | null>(null)
  const attempted = useRef(false)

  const join = (value: string) => {
    startTransition(async () => {
      const result = await joinGroup({ code: value })

      if (!result.ok) {
        setFailed(result.error)
        toast.error(result.error)
        return
      }

      toast.success(
        result.data.alreadyMember
          ? "You are already in this group."
          : "You're in."
      )
      router.push(`/groups/${result.data.groupId}`)
      router.refresh()
    })
  }

  // Following an invite link should just work — the code is already in the URL,
  // so asking the person to retype it would be theatre.
  useEffect(() => {
    if (!autoJoin || attempted.current || !initialCode) return
    attempted.current = true
    join(initialCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoin, initialCode])

  if (autoJoin && pending) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Spinner />
        <p className="text-sm text-muted-foreground">Adding you to the group…</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        setFailed(null)
        join(code)
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="code">Invite code or link</Label>
        <Input
          id="code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="7KQ4MRZ2"
          autoCapitalize="characters"
          autoComplete="off"
          className="font-mono tracking-[0.15em] uppercase"
        />
        {failed ? <p className="text-xs text-destructive">{failed}</p> : null}
      </div>
      <Button type="submit" className="w-full" disabled={pending || !code.trim()}>
        {pending ? "Joining…" : "Join group"}
      </Button>
    </form>
  )
}
