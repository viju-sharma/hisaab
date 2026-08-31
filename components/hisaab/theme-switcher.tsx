"use client"

import { Monitor, Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useIsHydrated } from "@/hooks/use-hydrated"
import type { Theme } from "@/lib/theme"
import { cn } from "@/lib/utils"

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match system", icon: Monitor },
]

/// Sits in the shell rather than only in settings: switching theme is something
/// people do while looking at the thing they want to see differently.
export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const hydrated = useIsHydrated()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={className}
          aria-label="Change theme"
        >
          {/* Both icons are rendered and cross-faded, so the control never
              pops in after hydration. */}
          <Sun
            className={cn(
              "transition-all",
              resolvedTheme === "dark" && "scale-0 -rotate-90 opacity-0"
            )}
          />
          <Moon
            className={cn(
              "absolute transition-all",
              resolvedTheme !== "dark" && "scale-0 rotate-90 opacity-0"
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => setTheme(option.value)}
            className="justify-between"
          >
            <span className="flex items-center gap-2">
              <option.icon className="size-4" />
              {option.label}
            </span>
            {hydrated && theme === option.value ? (
              <span className="size-1.5 rounded-full bg-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
