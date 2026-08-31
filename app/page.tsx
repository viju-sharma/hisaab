import Link from "next/link"
import { redirect } from "next/navigation"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import {
  ArrowRight,
  Coins,
  ReceiptText,
  ScrollText,
  Split,
} from "lucide-react"

import { HisaabLogo, HisaabMark } from "@/components/brand/logo"
import { ThemeSwitcher } from "@/components/hisaab/theme-switcher"
import { AppPreview } from "@/components/marketing/app-preview"
import { Button } from "@/components/ui/button"

const POINTS = [
  {
    icon: Split,
    title: "Split however it actually happened",
    body: "Evenly, by exact amounts, by percentage, or by shares. More than one person can have paid, and you can log an expense on someone else's behalf.",
  },
  {
    icon: Coins,
    title: "Rupees first",
    body: "₹1,20,000 reads in lakhs, the way it should. Spending abroad converts at the rate on the day and locks in, so old balances never drift.",
  },
  {
    icon: ReceiptText,
    title: "Settle in the fewest payments",
    body: "Four people, one round of transfers. Hisaab collapses a tangle of debts into the shortest set of payments that squares everyone.",
  },
  {
    icon: ScrollText,
    title: "Nothing quietly changes",
    body: "Every edit is recorded with who made it and what it changed, and the whole group sees it in the activity feed.",
  },
]

export default async function LandingPage() {
  const { userId } = await auth()
  if (userId) redirect("/dashboard")

  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <HisaabLogo />
        <div className="flex items-center gap-1.5">
          <ThemeSwitcher />
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

      <main className="mx-auto max-w-6xl px-6">
        {/* 6/5 rather than 6/6: the copy needs the wider column, and the
            preview holds the rest so the fold is never half empty. */}
        <section className="grid items-center gap-12 py-14 md:grid-cols-11 md:gap-10 md:py-24">
          <div className="md:col-span-6">
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium">
              <span className="text-primary">हिसाब</span>
              <span className="text-muted-foreground">shared expenses, settled</span>
            </p>

            <h1 className="mt-5 font-display text-[2.75rem] leading-[1.02] text-balance md:text-6xl">
              Who paid, who owes, and what it takes to be square.
            </h1>

            <p className="mt-5 max-w-lg text-lg text-muted-foreground text-pretty">
              Hisaab keeps the ledger for your flat, your trip, and the dinner
              nobody wants to work out. In rupees, on every device, without the
              spreadsheet.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
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
          </div>

          <div className="md:col-span-5">
            <AppPreview />
          </div>
        </section>

        <section className="grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2">
          {POINTS.map((point) => (
            <div key={point.title} className="bg-card p-6 md:p-7">
              <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <point.icon className="size-4" />
              </span>
              <h2 className="mt-4 text-[0.95rem] font-medium">{point.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                {point.body}
              </p>
            </div>
          ))}
        </section>

        <section className="py-20 text-center md:py-24">
          <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HisaabMark className="size-6" />
          </span>
          <h2 className="mx-auto mt-5 max-w-lg font-display text-3xl text-balance md:text-4xl">
            Stop keeping score in your head.
          </h2>
          <div className="mt-7">
            <SignUpButton>
              <Button size="lg">Create your first group</Button>
            </SignUpButton>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <HisaabLogo className="scale-90 opacity-80" />
          <span>Made for splitting things fairly.</span>
        </div>
      </footer>
    </div>
  )
}
