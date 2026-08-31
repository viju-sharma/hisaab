import { headers } from "next/headers"

import {
  REQUEST_HEADER,
  TRACE_HEADER,
  newRequestId,
  newTraceId,
  runWithContext,
  type RequestContext,
} from "./context"
import { log } from "./logger"

/// Builds the per-request context from the headers `proxy.ts` stamped, then runs
/// the work inside it. Every server entry point — actions, route handlers, page
/// loaders — goes through here, which is what makes one gesture produce one
/// connected trace.
export async function withRequestContext<T>(
  route: string,
  fn: () => Promise<T>
): Promise<T> {
  const headerList = await headers()

  const context: RequestContext = {
    traceId: headerList.get(TRACE_HEADER) ?? newTraceId(),
    requestId: headerList.get(REQUEST_HEADER) ?? newRequestId(),
    route,
    ip:
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerList.get("x-real-ip") ??
      undefined,
    userAgent: headerList.get("user-agent") ?? undefined,
    startedAt: performance.now(),
    depth: 0,
  }

  return runWithContext(context, async () => {
    log.info("request.start", { route })
    try {
      const result = await fn()
      log.info("request.end", {
        route,
        durationMs: round(performance.now() - context.startedAt),
      })
      return result
    } catch (error) {
      log.error("request.fail", {
        route,
        durationMs: round(performance.now() - context.startedAt),
        error,
      })
      throw error
    }
  }) as Promise<T>
}

/// For work with no incoming request — the cron routes' background passes.
export function withBackgroundContext<T>(
  route: string,
  fn: () => Promise<T>
): Promise<T> {
  const context: RequestContext = {
    traceId: newTraceId(),
    requestId: newRequestId(),
    route,
    startedAt: performance.now(),
    depth: 0,
  }
  return runWithContext(context, fn) as Promise<T>
}

function round(ms: number) {
  return Math.round(ms * 100) / 100
}
