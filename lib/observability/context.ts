import { AsyncLocalStorage } from "node:async_hooks"

/// Everything we want stamped on every log line and audit row for one request.
export type RequestContext = {
  /// Follows the whole gesture, including work handed to `after()`.
  traceId: string
  requestId: string
  route?: string
  userId?: string
  clerkId?: string
  ip?: string
  userAgent?: string
  startedAt: number
  /// Nesting level, so spans indent readably in dev.
  depth: number
}

const storage = new AsyncLocalStorage<RequestContext>()

export function getContext(): RequestContext | undefined {
  return storage.getStore()
}

export function runWithContext<T>(
  context: RequestContext,
  fn: () => T | Promise<T>
): T | Promise<T> {
  return storage.run(context, fn)
}

/// The actor is only known after Clerk resolves, which happens inside the
/// context rather than before it, so the store is filled in progressively.
export function identify(user: { userId?: string; clerkId?: string }) {
  const context = getContext()
  if (!context) return
  if (user.userId) context.userId = user.userId
  if (user.clerkId) context.clerkId = user.clerkId
}

export function newTraceId() {
  return `tr_${crypto.randomUUID().replace(/-/g, "")}`
}

export function newRequestId() {
  return `rq_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`
}

export const TRACE_HEADER = "x-hisaab-trace-id"
export const REQUEST_HEADER = "x-hisaab-request-id"
