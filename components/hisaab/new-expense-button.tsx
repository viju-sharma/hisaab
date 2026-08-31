"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import type { ShellGroup } from "@/components/shell/app-shell"

/// "Add an expense" needs a group before it needs anything else, so the button
/// asks for one first rather than opening a form with an empty group field.
/// With exactly one group there is nothing to ask, so it goes straight there.
export function NewExpenseButton({
  groups,
  variant = "icon",
  children,
}: {
  groups: ShellGroup[]
  variant?: "icon" | "fab"
  children?: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const go = (groupId: string) => {
    setOpen(false)
    router.push(`/groups/${groupId}/expenses/new`)
  }

  const trigger =
    children ??
    (
      <Button size="icon-sm" aria-label="Add an expense">
        <Plus />
      </Button>
    )

  if (groups.length === 0) {
    return (
      <button
        type="button"
        onClick={() => router.push("/groups/new")}
        className="contents"
      >
        {trigger}
      </button>
    )
  }

  if (groups.length === 1) {
    return (
      <button
        type="button"
        onClick={() => go(groups[0]!.id)}
        className="contents"
      >
        {trigger}
      </button>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button type="button" className="contents">
          {trigger}
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add an expense</DrawerTitle>
          <DrawerDescription>Which group is it for?</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-1 px-4 pb-8">
          {groups.map((group, index) => (
            <button
              key={group.id}
              type="button"
              onClick={() => go(group.id)}
              style={{ "--stagger": index } as React.CSSProperties}
              className="animate-row-in flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-muted active:bg-muted"
            >
              <span className="text-lg" aria-hidden>
                {group.emoji}
              </span>
              {group.name}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
