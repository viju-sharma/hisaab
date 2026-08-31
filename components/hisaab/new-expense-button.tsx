"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { GroupMark } from "@/components/hisaab/group-mark"
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
  children,
}: {
  groups: ShellGroup[]
  /// The caller supplies the visual, so the same behaviour backs both the
  /// desktop icon button and the mobile floating action button. It is rendered
  /// as the button's content — never wrapped in a second button, which would
  /// nest interactive elements and break hydration.
  children?: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const trigger = (onClick?: () => void) =>
    children ? (
      <button
        type="button"
        onClick={onClick}
        aria-label="Add an expense"
        className="contents"
      >
        {children}
      </button>
    ) : (
      <Button size="icon-sm" onClick={onClick} aria-label="Add an expense">
        <Plus />
      </Button>
    )

  if (groups.length === 0) {
    return trigger(() => router.push("/groups/new"))
  }

  if (groups.length === 1) {
    return trigger(() =>
      router.push(`/groups/${groups[0]!.id}/expenses/new`)
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger()}</DrawerTrigger>
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
              onClick={() => {
                setOpen(false)
                router.push(`/groups/${group.id}/expenses/new`)
              }}
              style={{ "--stagger": index } as React.CSSProperties}
              className="animate-row-in flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-muted active:bg-muted"
            >
              <GroupMark
                name={group.name}
                colorKey={group.colorKey}
                id={group.id}
                className="size-7 text-[0.6rem]"
              />
              {group.name}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
