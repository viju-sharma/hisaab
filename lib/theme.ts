export type Theme = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

export const THEME_STORAGE_KEY = "hisaab-theme"

const DARK_QUERY = "(prefers-color-scheme: dark)"

const listeners = new Set<() => void>()
let bound = false

function notify() {
  for (const listener of listeners) listener()
}

/// Bound once, lazily, the first time something subscribes — so importing this
/// module has no side effects and it stays safe to pull into a server bundle.
function bind() {
  if (bound) return
  bound = true

  window.matchMedia(DARK_QUERY).addEventListener("change", () => {
    applyTheme()
    notify()
  })

  // Another tab changed the preference.
  window.addEventListener("storage", (event) => {
    if (event.key !== THEME_STORAGE_KEY) return
    applyTheme()
    notify()
  })
}

export function subscribeToTheme(listener: () => void) {
  bind()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored
    }
  } catch {
    // Private mode, or site data blocked. "system" is the right answer anyway.
  }
  return "system"
}

export function readResolvedTheme(): ResolvedTheme {
  const theme = readTheme()
  if (theme !== "system") return theme
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light"
}

/// The single writer of the class the stylesheet keys off.
export function applyTheme() {
  const resolved = readResolvedTheme()
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  // Native controls and scrollbars follow this, not the class.
  root.style.colorScheme = resolved
}

export function writeTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Nothing to persist to; the change still applies for this page.
  }
  applyTheme()
  notify()
}

/// Runs before first paint, inlined in <head>. Kept as a string, and
/// deliberately duplicating the logic above, because it has to be
/// self-contained: nothing is loaded yet when it executes.
export const THEME_SCRIPT = `(function(){var s=null;try{s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)})}catch(e){}try{var t=s==="light"||s==="dark"?s:(window.matchMedia(${JSON.stringify(
  DARK_QUERY
)}).matches?"dark":"light"),r=document.documentElement;if(t==="dark")r.classList.add("dark");r.style.colorScheme=t}catch(e){}})()`
