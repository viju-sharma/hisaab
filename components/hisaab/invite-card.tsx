"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, RefreshCw, Share2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { createInvite } from "@/server/actions/group"

/// Two ways in, one card: an eight-character code that survives being read out
/// over a phone call, and a link to paste into whatever chat the group already
/// uses. Nothing is emailed — sharing stays where the people already are.
export function InviteCard({
  groupId,
  groupName,
  code,
  token,
  origin,
  canRotate,
}: {
  groupId: string
  groupName: string
  code: string
  token: string
  /// Resolved on the server from the request host: the link has to be absolute
  /// to survive being pasted into a chat.
  origin: string
  canRotate: boolean
}) {
  const router = useRouter()
  const [copied, setCopied] = useState<"code" | "link" | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(null), 1800)
    return () => clearTimeout(timer)
  }, [copied])

  const link = origin ? `${origin}/join/${token}` : ""

  const copy = async (value: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      toast.success(kind === "code" ? "Code copied." : "Invite link copied.")
    } catch {
      toast.error("Could not copy — select the text and copy it manually.")
    }
  }

  const share = async () => {
    if (!navigator.share) {
      await copy(link, "link")
      return
    }
    try {
      await navigator.share({
        title: `Join ${groupName} on Hisaab`,
        text: `Join ${groupName} on Hisaab to split expenses.`,
        url: link,
      })
    } catch {
      // The user dismissed the share sheet; nothing to report.
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <h2 className="font-sans text-sm font-medium">Invite people</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Share the code or the link. Anyone with either can join this group.
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-xl border bg-muted/50 p-3">
        <code className="flex-1 font-mono text-lg tracking-[0.2em] tabular-nums">
          {code}
        </code>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => copy(code, "code")}
          aria-label="Copy the invite code"
        >
          {copied === "code" ? <Check className="text-positive" /> : <Copy />}
        </Button>
      </div>

      <div className="mt-2 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => copy(link, "link")}
          disabled={!link}
        >
          {copied === "link" ? (
            <Check data-icon="inline-start" className="text-positive" />
          ) : (
            <Copy data-icon="inline-start" />
          )}
          Copy link
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={share}
          disabled={!link}
        >
          <Share2 data-icon="inline-start" />
          Share
        </Button>
      </div>

      {canRotate ? (
        <Button
          variant="ghost"
          size="xs"
          className="mt-3"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await createInvite({
                groupId,
                expiresInDays: null,
                maxUses: null,
              })
              if (!result.ok) {
                toast.error(result.error)
                return
              }
              toast.success("New code generated. The old one no longer works.")
              router.refresh()
            })
          }
        >
          <RefreshCw data-icon="inline-start" />
          Generate a new code
        </Button>
      ) : null}
    </div>
  )
}
