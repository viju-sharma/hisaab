import type { Metadata } from "next"
import { UserButton } from "@clerk/nextjs"

import { HisaabLogo } from "@/components/brand/logo"
import { PageHeader } from "@/components/hisaab/page-header"
import { ThemeToggle } from "@/components/hisaab/theme-toggle"
import { InstallPrompt } from "@/components/pwa/install-prompt"
import { PushToggle } from "@/components/pwa/push-toggle"
import { SectionHeading } from "@/components/hisaab/section-heading"
import { getOrCreateUser } from "@/lib/auth"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage() {
  const user = await getOrCreateUser()

  return (
    <>
      <PageHeader title="Settings" />

      <div className="space-y-6 pb-8">
        <section className="flex items-center gap-3 rounded-2xl border bg-card p-4">
          <UserButton />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {user.name ?? "Your account"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeading>App</SectionHeading>
          <InstallPrompt />
          <PushToggle
            vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
          />
          <ThemeToggle />
        </section>

        <section className="space-y-3">
          <SectionHeading>Preferences</SectionHeading>
          <dl className="divide-y overflow-hidden rounded-xl border text-sm">
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">Default currency</dt>
              <dd className="font-medium">{user.defaultCurrency}</dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">Time zone</dt>
              <dd className="font-medium">{user.timezone}</dd>
            </div>
          </dl>
        </section>

        <footer className="flex items-center gap-2 pt-4 text-xs text-muted-foreground">
          <HisaabLogo showWordmark={false} className="opacity-60" />
          Hisaab — shared expenses, settled.
        </footer>
      </div>
    </>
  )
}
