import type { Metadata } from "next"
import { SignIn } from "@clerk/nextjs"

/// Indexable and canonical to itself: it is a real destination people search
/// for by name, and Clerk mounts the same form on every catch-all segment
/// beneath it, all of which must point back here.
export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Hisaab to see what your groups owe, add an expense, and settle up.",
  alternates: { canonical: "/sign-in" },
  openGraph: { url: "/sign-in", title: "Sign in · Hisaab" },
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  )
}
