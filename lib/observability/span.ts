import { getContext } from "./context"
import { log } from "./logger"

/// Wraps a unit of work so the log shows `name.start` / `name.end` with a
/// duration, nested by depth. This is what turns a pile of log lines into a
/// readable trace of one gesture without an external collector.
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  fields: Record<string, unknown> = {}
): Promise<T> {
  const context = getContext()
  const startedAt = performance.now()

  log.debug(`${name}.start`, fields)
  if (context) context.depth += 1

  try {
    const result = await fn()
    if (context) context.depth -= 1
    log.info(`${name}.end`, {
      ...fields,
      durationMs: round(performance.now() - startedAt),
    })
    return result
  } catch (error) {
    if (context) context.depth -= 1
    log.error(`${name}.fail`, {
      ...fields,
      durationMs: round(performance.now() - startedAt),
      error,
    })
    throw error
  }
}

function round(ms: number) {
  return Math.round(ms * 100) / 100
}
