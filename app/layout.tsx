import type { Metadata, Viewport } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { shadcn } from "@clerk/ui/themes"
import { Geist_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google"

import "./globals.css"
import { ServiceWorker } from "@/components/pwa/service-worker"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeScript } from "@/components/theme-script"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" })

/// A second face only for headings and the wordmark — enough warmth to stop the
/// app reading as a generic Inter dashboard, without a second personality.
const fontDisplay = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
})

const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
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
          fontDisplay.variable,
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
