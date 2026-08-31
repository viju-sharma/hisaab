import type { DbTransaction } from "@/lib/db"
import type { AuditAction, JsonValue } from "@/lib/db-types"
import { newId } from "@/lib/id"

import { getContext } from "./context"
import { log } from "./logger"

export type AuditInput = {
  action: AuditAction
  entityType: string
  entityId: string
  groupId?: string | null
  before?: unknown
  after?: unknown
}

/// Turns rows into something a Json column accepts: Dates become ISO strings,
/// BigInts become strings, undefined disappears. Timestamps already arrive as
/// strings from the data layer (see lib/db-time.ts), and so do numerics, but
/// callers may hand this a `Date` they built themselves.
function jsonify(value: unknown): JsonValue {
  if (value === undefined || value === null) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "bigint") return value.toString()
  if (Array.isArray(value)) return value.map(jsonify)
  if (typeof value === "object") {
    const out: Record<string, JsonValue> = {}
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue
      out[key] = jsonify(item)
    }
    return out
  }
  return value as JsonValue
}

/// Field-level changes only, so a history view can say "amount 500 → 650"
/// without diffing two whole blobs at read time.
function diffOf(before: JsonValue, after: JsonValue): JsonValue {
  if (
    !before ||
    !after ||
    typeof before !== "object" ||
    typeof after !== "object"
  ) {
    return null
  }
  const a = before as Record<string, JsonValue>
  const b = after as Record<string, JsonValue>
  const changed: Record<string, JsonValue> = {}
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (key === "updatedAt") continue
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
      changed[key] = { from: a[key] ?? null, to: b[key] ?? null }
    }
  }
  return Object.keys(changed).length ? changed : null
}

/// Call inside the same transaction as the mutation it describes, so an audit
/// row can never be lost to a partial failure.
export async function recordAudit(tx: DbTransaction, input: AuditInput) {
  const context = getContext()
  const before = jsonify(input.before)
  const after = jsonify(input.after)

  await tx.orm.public.AuditLog.create({
    id: newId(),
    traceId: context?.traceId ?? "untraced",
    requestId: context?.requestId ?? null,
    actorUserId: context?.userId ?? null,
    actorClerkId: context?.clerkId ?? null,
    groupId: input.groupId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before,
    after,
    diff: diffOf(before, after),
    route: context?.route ?? null,
    ip: context?.ip ?? null,
    userAgent: context?.userAgent ?? null,
  })

  log.info("audit.record", {
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
  })
}
