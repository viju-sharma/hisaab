"use client"

import { useTheme } from "next-themes"
import { Monitor, Moon, Sun } from "lucide-react"

import { useIsHydrated } from "@/hooks/use-hydrated"
import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Monitor },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  // The active theme is only known on the client; marking the selection before
  // hydration would render a choice the server never agreed to.
  const mounted = useIsHydrated()

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
      <span className="text-sm font-medium">Appearance</span>
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-pressed={mounted && theme === option.value}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
              mounted && theme === option.value
                ? "bg-background shadow-sm"
                : "text-muted-foreground"
            )}
          >
            <option.icon className="size-3.5" />
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
