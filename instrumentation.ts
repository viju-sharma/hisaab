import type { Instrumentation } from "next"

export function register() {
  // Imported lazily: the logger pulls in node:async_hooks, which must not be
  // bundled into any edge-adjacent entry point.
  void import("@/lib/observability/logger").then(({ log }) => {
    log.info("server.boot", {
      env: process.env.NODE_ENV,
      runtime: process.env.NEXT_RUNTIME,
    })
  })
}

/// Uncaught server errors still carry the active trace, so a failed gesture is
/// findable by the same trace ID as its successful log lines.
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  const { log } = await import("@/lib/observability/logger")
  log.error("request.error", {
    error,
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    renderSource: context.renderSource,
  })
}
