import type { Metadata } from "next"
import { SignUp } from "@clerk/nextjs"

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Start a group on Hisaab and split bills with friends, flatmates and family. Free, and no email needed to be invited.",
  alternates: { canonical: "/sign-up" },
  openGraph: { url: "/sign-up", title: "Create an account · Hisaab" },
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  )
}
