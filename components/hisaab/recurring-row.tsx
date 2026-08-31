"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pause, Play, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { deleteRecurring, toggleRecurring } from "@/server/actions/recurring"

export function RecurringRow({
  recurringId,
  paused,
}: {
  recurringId: string
  paused: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex shrink-0 gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        aria-label={paused ? "Resume this schedule" : "Pause this schedule"}
        onClick={() =>
          startTransition(async () => {
            const result = await toggleRecurring({ recurringId })
            if (!result.ok) {
              toast.error(result.error)
              return
            }
            toast.success(result.data.paused ? "Paused." : "Resumed.")
            router.refresh()
          })
        }
      >
        {paused ? <Play /> : <Pause />}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        aria-label="Remove this schedule"
        onClick={() =>
          startTransition(async () => {
            const result = await deleteRecurring({ recurringId })
            if (!result.ok) {
              toast.error(result.error)
              return
            }
            toast.success("Schedule removed. Past expenses are untouched.")
            router.refresh()
          })
        }
      >
        <Trash2 />
      </Button>
    </div>
  )
}
