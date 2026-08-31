import { THEME_SCRIPT } from "@/lib/theme"

/// Rendered from the root layout, which is a Server Component — so the tag is
/// part of the server-rendered HTML and actually runs, before the browser
/// paints anything. A client component cannot do this: React 19 warns that a
/// script created during a client render never executes.
export function ThemeScript() {
  return (
    <script
      // The class it sets is the one the server did not know about, so React
      // must not treat the difference as a hydration error.
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  )
}
