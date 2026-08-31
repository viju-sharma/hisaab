import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

/// True only after hydration. Lets a component read browser-only facts
/// (`matchMedia`, `navigator`) during render instead of setting state from an
/// effect, which would cascade an extra render.
export function useIsHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
