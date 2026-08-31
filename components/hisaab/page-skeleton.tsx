import { Skeleton } from "@/components/ui/skeleton"

/// The shape every route falls back to while its server render is in flight.
/// Navigation is a full round trip to the server on every route — nothing here
/// is cacheable while `auth.protect()` gates it — so without a boundary the
/// previous page just sits there and the app reads as frozen. A header plus a
/// few rows is enough to make the gesture feel answered.
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="pt-6 pb-6 md:pt-0" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-3 pb-6">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-9 w-56 md:h-10 md:w-72" />
          <Skeleton className="h-4 w-64 md:w-96" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}
