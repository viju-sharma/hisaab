"use client"

import { useEffect } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

/// Anything that throws below the root layout lands here. It stays deliberately
/// plain: an error page that needs the app's data to render is an error page
/// that can fail twice.
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // The server log already has the stack; the digest is what ties this
    // screen to that entry when someone reports it.
    console.error("app.error", error.digest ?? error.message)
  }, [error])

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6">
      <p className="label-mono text-muted-foreground">Something broke</p>
      <h1 className="font-display mt-4 text-3xl leading-tight text-balance">
        That did not go through.
      </h1>
      <p className="mt-3 text-sm text-muted-foreground text-pretty">
        The ledger is untouched — nothing was saved. Try again, and if it keeps
        happening the reference below will tell us where it failed.
      </p>

      <div className="mt-8 flex flex-wrap gap-2.5">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to home</Link>
        </Button>
      </div>

      {error.digest ? (
        <p className="label-mono mt-8 text-muted-foreground">
          Reference {error.digest}
        </p>
      ) : null}
    </main>
  )
}
