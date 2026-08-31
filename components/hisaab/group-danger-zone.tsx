"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { archiveGroup, leaveGroup } from "@/server/actions/group"

/// Leaving and archiving both refuse while money is outstanding — the server
/// enforces that, and the copy here says so up front rather than letting
/// someone find out by being rejected.
export function GroupDangerZone({
  groupId,
  role,
  archived,
}: {
  groupId: string
  role: "OWNER" | "ADMIN" | "MEMBER"
  archived: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const run = (
    action: () => Promise<{ ok: boolean; error?: string }>,
    success: string
  ) =>
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.error ?? "That did not work.")
        return
      }
      toast.success(success)
      router.push("/groups")
      router.refresh()
    })

  return (
    <section className="rounded-2xl border border-destructive/25 p-5">
      <h2 className="font-display font-medium">Careful</h2>

      {role === "OWNER" ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Archiving makes the group read-only for everyone. Nothing is
            deleted, and the history stays available.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="mt-3"
                disabled={pending || archived}
              >
                {archived ? "Already archived" : "Archive group"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive this group?</AlertDialogTitle>
                <AlertDialogDescription>
                  Nobody will be able to add expenses. You can still see the
                  full history and every balance.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    run(() => archiveGroup({ groupId }), "Group archived.")
                  }
                >
                  Archive
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            You can leave once your balance in this group is zero.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="mt-3"
                disabled={pending}
              >
                Leave group
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave this group?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your name stays on past expenses so the history still makes
                  sense. You can rejoin with the invite code.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Stay</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => run(() => leaveGroup({ groupId }), "You left the group.")}
                >
                  Leave
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </section>
  )
}
