"use client"

import * as React from "react"

import {
  readResolvedTheme,
  readTheme,
  subscribeToTheme,
  writeTheme,
  type ResolvedTheme,
  type Theme,
} from "@/lib/theme"

/// A local replacement for next-themes. next-themes renders its no-flash script
/// from inside the provider, which React 19 warns about — a script created
/// during a client render never executes. Here the script is server-rendered
/// into <head> (see components/theme-script.tsx) and the client only reads
/// state, through useSyncExternalStore rather than an effect.
export function useTheme(): {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
} {
  const theme = React.useSyncExternalStore(
    subscribeToTheme,
    readTheme,
    () => "system" as const
  )
  const resolvedTheme = React.useSyncExternalStore(
    subscribeToTheme,
    readResolvedTheme,
    () => "light" as const
  )

  return { theme, resolvedTheme, setTheme: writeTheme }
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeHotkey />
      {children}
    </>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

export { ThemeProvider }
