import Link from "next/link"
import { redirect } from "next/navigation"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { ArrowRight, Check } from "lucide-react"

import { HisaabLogo, HisaabMark } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

const POINTS = [
  {
    title: "Split however it actually happened",
    body: "Evenly, by exact amounts, by percentage, or by shares. More than one person can have paid, and you can log an expense on someone else's behalf.",
  },
  {
    title: "Rupees first",
    body: "₹1,20,000 reads in lakhs, the way it should. Spending abroad is converted at the rate on the day, and locked in so old balances never drift.",
  },
  {
    title: "Settle in the fewest payments",
    body: "Four people, one round of transfers. Hisaab collapses a tangle of debts into the shortest set of payments that squares everyone.",
  },
  {
    title: "Nothing quietly changes",
    body: "Every edit is recorded with who made it and what it changed, and the group sees it in the activity feed.",
  },
]

export default async function LandingPage() {
  const { userId } = await auth()
  if (userId) redirect("/dashboard")

  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <HisaabLogo />
        <div className="flex items-center gap-2">
          <SignInButton>
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton>
            <Button size="sm">Get started</Button>
          </SignUpButton>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="py-16 md:py-28">
          <p className="text-sm font-medium text-primary">
            हिसाब · shared expenses, settled
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl">
            Who paid, who owes, and what it takes to be square.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground text-pretty">
            Hisaab keeps the ledger for your flat, your trip, and the dinner
            nobody wants to work out. In rupees, on every device, without the
            spreadsheet.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <SignUpButton>
              <Button size="lg">
                Start a group
                <ArrowRight data-icon="inline-end" />
              </Button>
            </SignUpButton>
            <Button asChild size="lg" variant="outline">
              <Link href="/join">I have an invite code</Link>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Free. Invite people with a code or a link — no email required.
          </p>
        </section>

        <section className="grid gap-px overflow-hidden rounded-3xl border bg-border sm:grid-cols-2">
          {POINTS.map((point) => (
            <div key={point.title} className="bg-background p-6 md:p-8">
              <Check className="size-4 text-primary" />
              <h2 className="mt-3 font-display font-medium">{point.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                {point.body}
              </p>
            </div>
          ))}
        </section>

        <section className="py-20 text-center md:py-28">
          <HisaabMark className="mx-auto size-8 text-primary" />
          <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            Stop keeping score in your head.
          </h2>
          <div className="mt-6">
            <SignUpButton>
              <Button size="lg">Create your first group</Button>
            </SignUpButton>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span>Hisaab</span>
          <span>Made for splitting things fairly.</span>
        </div>
      </footer>
    </div>
  )
}
