import { getContext } from "./context"

export type LogLevel = "debug" | "info" | "warn" | "error"

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const MIN_LEVEL =
  LEVELS[(process.env.LOG_LEVEL as LogLevel) ?? "debug"] ?? LEVELS.debug

const PRETTY = process.env.NODE_ENV !== "production"

/// Field names whose values never reach the log, wherever they appear.
const REDACT = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "p256dh",
  "auth",
  "endpoint",
  "clerkSecretKey",
])

function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") return value
  if (seen.has(value as object)) return "[circular]"
  seen.add(value as object)
  if (Array.isArray(value)) return value.map((item) => redact(item, seen))
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    out[key] = REDACT.has(key) ? "[redacted]" : redact(item, seen)
  }
  return out
}

const DIM = "\x1b[2m"
const RESET = "\x1b[0m"
const COLOR: Record<LogLevel, string> = {
  debug: "\x1b[90m",
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
}

function emit(level: LogLevel, event: string, fields: Record<string, unknown>) {
  if (LEVELS[level] < MIN_LEVEL) return

  const context = getContext()
  const record = {
    ts: new Date().toISOString(),
    level,
    event,
    traceId: context?.traceId,
    requestId: context?.requestId,
    userId: context?.userId,
    route: context?.route,
    ...(redact(fields) as Record<string, unknown>),
  }

  if (!PRETTY) {
    process.stdout.write(`${JSON.stringify(record)}\n`)
    return
  }

  // In dev, indent by span depth so one request reads top to bottom as a tree.
  const indent = "  ".repeat(context?.depth ?? 0)
  const { ts, traceId, requestId, userId, route, ...rest } = record
  void ts
  void requestId
  void userId
  void route
  const detail = Object.keys(rest).filter((k) => k !== "level" && k !== "event")
  const suffix = detail.length
    ? ` ${DIM}${detail
        .map((k) => `${k}=${format(rest[k as keyof typeof rest])}`)
        .join(" ")}${RESET}`
    : ""
  process.stdout.write(
    `${COLOR[level]}${level.padEnd(5)}${RESET} ${DIM}${
      traceId?.slice(3, 11) ?? "--------"
    }${RESET} ${indent}${event}${suffix}\n`
  )
}

function format(value: unknown) {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return JSON.stringify(value)
}

export const log = {
  debug: (event: string, fields: Record<string, unknown> = {}) =>
    emit("debug", event, fields),
  info: (event: string, fields: Record<string, unknown> = {}) =>
    emit("info", event, fields),
  warn: (event: string, fields: Record<string, unknown> = {}) =>
    emit("warn", event, fields),
  error: (event: string, fields: Record<string, unknown> = {}) =>
    emit("error", event, fields),
}
