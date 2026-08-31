import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// Inlined rather than imported from lib/observability/context: proxy runs
// separately from render code and must not pull the AsyncLocalStorage module
// into its bundle. The header is the sanctioned hand-off channel.
const TRACE_HEADER = "x-hisaab-trace-id"
const REQUEST_HEADER = "x-hisaab-request-id"

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Only the invite-link landing is public. Bare /join lives inside the signed
  // -in shell, so leaving it public rendered the app layout without a user.
  "/join/(.*)",
  "/offline",
  "/api/webhooks(.*)",
  "/api/cron(.*)",
  "/manifest.webmanifest",
  "/sw.js",
  "/icons(.*)",
])

export default clerkMiddleware(async (auth, request) => {
  const requestHeaders = new Headers(request.headers)

  // Honour an inbound trace ID so a retry or a client-initiated request can be
  // stitched to the gesture that started it; otherwise mint a fresh one.
  const traceId =
    requestHeaders.get(TRACE_HEADER) ??
    `tr_${crypto.randomUUID().replace(/-/g, "")}`
  const requestId = `rq_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`

  requestHeaders.set(TRACE_HEADER, traceId)
  requestHeaders.set(REQUEST_HEADER, requestId)

  // An optimistic gate only — the real authorisation check lives in
  // lib/authz.ts and runs on every read and write.
  if (!isPublicRoute(request)) await auth.protect()

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set(TRACE_HEADER, traceId)
  return response
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk's auto-proxy path
    "/__clerk/:path*",
  ],
}
