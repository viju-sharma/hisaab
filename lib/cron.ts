import type { NextRequest } from "next/server"

/// Cron routes are public to the proxy (a scheduler has no session), so the
/// bearer secret is the only thing standing between the internet and a
/// materialisation run.
export function isAuthorisedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== "production"

  const header = request.headers.get("authorization")
  return header === `Bearer ${secret}`
}
