import Link from "next/link"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import { ArrowRight } from "lucide-react"

import { HisaabLogo } from "@/components/brand/logo"
import { ThemeSwitcher } from "@/components/hisaab/theme-switcher"
import { AppPreview } from "@/components/marketing/app-preview"
import { Reveal } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"

const POINTS = [
  {
    title: "Split however it actually happened",
    body: "Evenly, by exact amounts, by percentage, or by shares. More than one person can have paid, and you can log an expense on someone else's behalf.",
  },
  {
    title: "Rupees first",
    body: "₹1,20,000 reads in lakhs, the way it should. Spending abroad converts at the rate on the day and locks in, so old balances never drift.",
  },
  {
    title: "Settle in the fewest payments",
    body: "Four people, one round of transfers. Hisaab collapses a tangle of debts into the shortest set of payments that squares everyone.",
  },
  {
    title: "Nothing quietly changes",
    body: "Every edit is recorded with who made it and what it changed, and the whole group sees it in the activity feed.",
  },
]

/// Deliberately free of `auth()`: the signed-in redirect lives in the proxy, so
/// this page prerenders at build time and is served from the edge as static
/// HTML. It is the first thing anyone sees and the only page with no reason to
/// wait on a server.
export default function LandingPage() {
  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
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
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6">
          <div className="grid gap-14 border-b py-14 md:grid-cols-12 md:gap-12 md:py-20">
            {/* Staggered in CSS with delays rather than through the motion
                runtime: this is the fold of a static page, and it has to paint
                before any JavaScript arrives. */}
            <div className="md:col-span-7">
              <div className="rise-in">
                <p className="label-mono text-muted-foreground">
                  हिसाब — shared expenses, settled
                </p>
              </div>

              {/* The headline is the design. Size and tracking do the work a
                  second typeface was doing before. */}
              <div className="rise-in" style={{ animationDelay: "0.07s" }}>
                <h1 className="mt-6 font-display text-[3.25rem] leading-[0.93] font-medium text-balance md:text-[5.25rem]">
                  {/* The breaks are the desktop composition; on a narrow screen
                      they fight the natural wrap, so they are switched off. */}
                  Who paid, who owes, <br className="hidden md:inline" />
                  and what it takes <br className="hidden md:inline" />
                  <span className="relative inline-block">
                    to be square.
                    <span className="absolute inset-x-0 -bottom-2 h-[0.055em] bg-brand md:-bottom-3" />
                  </span>
                </h1>
              </div>

              <div className="rise-in" style={{ animationDelay: "0.14s" }}>
                <p className="mt-8 max-w-md text-lg leading-relaxed text-pretty text-muted-foreground">
                  Hisaab keeps the ledger for your flat, your trip, and the
                  dinner nobody wants to work out. In rupees, on every device,
                  without the spreadsheet.
                </p>
              </div>

              <div className="rise-in" style={{ animationDelay: "0.21s" }}>
                <div className="mt-9 flex flex-wrap items-center gap-2.5">
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
              </div>

              <div className="rise-in" style={{ animationDelay: "0.28s" }}>
                <p className="label-mono mt-6 text-muted-foreground">
                  Free — invite by code or link, no email required
                </p>
              </div>
            </div>

            {/* Beside the hero on desktop, so it is above the fold there too
                and gets the same CSS treatment rather than the JS one. */}
            <div
              className="rise-in md:col-span-5 md:pt-10"
              style={{ animationDelay: "0.35s" }}
            >
              <AppPreview />
            </div>
          </div>
        </section>

        {/* Numbered and ruled, like a contents page. Four bordered boxes in a
            grid was the most template-shaped part of the old layout. */}
        <section className="mx-auto max-w-6xl px-6">
          <div className="border-b py-14 md:py-18">
            <h2 className="label-mono text-muted-foreground">What it does</h2>
            <dl className="mt-8">
              {POINTS.map((point, index) => (
                // The rule and spacing live on the Reveal itself: wrapping each
                // row in an extra element would make every row a `:first-child`
                // and every row would lose its top border.
                <Reveal
                  key={point.title}
                  className="grid gap-2 border-t py-7 first:border-t-0 first:pt-0 md:grid-cols-12 md:gap-8"
                >
                  <dt className="flex items-baseline gap-4 md:col-span-5">
                    <span className="label-mono text-brand">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-2xl leading-tight text-balance">
                      {point.title}
                    </span>
                  </dt>
                  <dd className="text-pretty text-muted-foreground md:col-span-6 md:col-start-7">
                    {point.body}
                  </dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6">
          <Reveal className="py-20 md:py-28">
            <h2 className="max-w-2xl font-display text-[2.5rem] leading-[0.95] font-medium text-balance md:text-6xl">
              Stop keeping score in your head.
            </h2>
            <div className="mt-9">
              <SignUpButton>
                <Button size="lg">
                  Create your first group
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </SignUpButton>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <HisaabLogo />
          <span className="label-mono text-muted-foreground">
            Made for splitting things fairly
          </span>
        </div>
      </footer>
    </div>
  )
}
