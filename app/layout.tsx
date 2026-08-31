import type { Metadata, Viewport } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { shadcn } from "@clerk/ui/themes"
import { Archivo, Geist_Mono } from "next/font/google"

import "./globals.css"
import { ServiceWorker } from "@/components/pwa/service-worker"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeScript } from "@/components/theme-script"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { siteUrl } from "@/lib/site-url"
import { cn } from "@/lib/utils"

/// One grotesque for everything. A second display face was doing the work a
/// size jump should do, and the pairing it made — serif headline over sans body
/// — is the house style of generated interfaces.
const fontSans = Archivo({
  subsets: ["latin"],
  variable: "--font-sans",
  axes: ["wdth"],
})

const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  // Absolute URLs for canonical links and social cards; without it Next warns
  // and resolves them against localhost.
  metadataBase: new URL(siteUrl),
  title: {
    default: "Hisaab — shared expenses, settled",
    template: "%s · Hisaab",
  },
  description:
    "Split bills with friends, flatmates and family. Track who paid, who owes, and settle up — in rupees.",
  applicationName: "Hisaab",
  appleWebApp: {
    capable: true,
    title: "Hisaab",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/brand/mark.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The app shell is fixed; letting the page zoom would detach the bottom bar.
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfcfa" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1a19" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // ClerkProvider wraps <html> so Clerk can inject into <head>.
    <ClerkProvider appearance={{ theme: shadcn }}>
      <html
        lang="en-IN"
        suppressHydrationWarning
        className={cn(
          "antialiased",
          fontSans.variable,
          fontMono.variable
        )}
      >
        <head>
          <ThemeScript />
        </head>
        <body className="min-h-svh bg-background">
          <ThemeProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster position="top-center" richColors closeButton />
            <ServiceWorker />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
