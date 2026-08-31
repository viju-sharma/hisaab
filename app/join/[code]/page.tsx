import type { Metadata } from "next"
import { auth } from "@clerk/nextjs/server"
import { SignInButton, SignUpButton } from "@clerk/nextjs"

import { HisaabLogo } from "@/components/brand/logo"
import { JoinByCode } from "@/components/hisaab/join-by-code"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Join a group" }

/// Public on purpose: an invite link has to work for someone who has never
/// heard of Hisaab. The code is carried through sign-in so nobody has to find
/// the link again afterwards.
export default async function JoinWithCodePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const { userId } = await auth()

  if (userId) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6">
        <JoinByCode initialCode={code} autoJoin />
      </main>
    )
  }

  const returnTo = `/join/${code}`

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6 text-center">
      <HisaabLogo className="mx-auto" />
      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-balance">
        You have been invited to split expenses
      </h1>
      <p className="mt-2 text-sm text-muted-foreground text-pretty">
        Sign in and you will join the group straight away. Your invite is
        remembered.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        <SignUpButton
          forceRedirectUrl={returnTo}
          signInForceRedirectUrl={returnTo}
        >
          <Button size="lg">Create an account</Button>
        </SignUpButton>
        <SignInButton forceRedirectUrl={returnTo}>
          <Button size="lg" variant="outline">
            I already have one
          </Button>
        </SignInButton>
      </div>
    </main>
  )
}
