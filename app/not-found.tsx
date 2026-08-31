import Link from "next/link"

import { HisaabLogo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Not found" }

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6">
      <HisaabLogo />
      <p className="label-mono mt-10 text-muted-foreground">404</p>
      <h1 className="font-display mt-3 text-3xl leading-tight text-balance">
        There is nothing at this address.
      </h1>
      <p className="mt-3 text-sm text-muted-foreground text-pretty">
        The link may be old, or the group it pointed at may have been deleted.
      </p>
      <div className="mt-8 flex flex-wrap gap-2.5">
        <Button asChild>
          <Link href="/dashboard">Go to your groups</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/join">Enter an invite code</Link>
        </Button>
      </div>
    </main>
  )
}
