"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { SendHorizontal } from "lucide-react"
import { toast } from "sonner"

import { MemberAvatar } from "@/components/hisaab/member-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SectionHeading } from "@/components/hisaab/section-heading"
import { addComment } from "@/server/actions/expense"

type Comment = {
  id: string
  body: string
  createdAt: Date
  user: { id: string; name: string | null; imageUrl: string | null }
}

export function CommentBox({
  expenseId,
  viewerId,
  comments,
}: {
  expenseId: string
  viewerId: string
  comments: Comment[]
}) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [pending, startTransition] = useTransition()

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!body.trim()) return

    startTransition(async () => {
      const result = await addComment({ expenseId, body })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setBody("")
      router.refresh()
    })
  }

  return (
    <section>
      <SectionHeading>Comments</SectionHeading>

      {comments.length > 0 ? (
        <ul className="mb-3 space-y-3">
          {comments.map((comment, index) => (
            <li
              key={comment.id}
              style={{ "--stagger": index } as React.CSSProperties}
              className="animate-row-in flex gap-2.5"
            >
              <MemberAvatar
                member={{
                  userId: comment.user.id,
                  name: comment.user.name ?? "Someone",
                  imageUrl: comment.user.imageUrl,
                }}
              />
              <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  {comment.user.id === viewerId
                    ? "You"
                    : (comment.user.name ?? "Someone")}{" "}
                  ·{" "}
                  {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                </p>
                <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-muted-foreground">
          Nothing here yet. Ask a question if something looks off.
        </p>
      )}

      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add a comment"
          maxLength={1000}
        />
        <Button
          type="submit"
          size="icon"
          disabled={pending || !body.trim()}
          aria-label="Post comment"
        >
          <SendHorizontal />
        </Button>
      </form>
    </section>
  )
}
