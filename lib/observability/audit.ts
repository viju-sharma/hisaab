import type { AuditAction } from "@/app/generated/prisma/enums"
import type { PrismaTransaction } from "@/lib/prisma"

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

/// Turns Prisma rows into something a Json column accepts: Dates become ISO
/// strings, Decimals and BigInts become strings, undefined disappears.
function jsonify(value: unknown): unknown {
  if (value === undefined || value === null) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "bigint") return value.toString()
  if (Array.isArray(value)) return value.map(jsonify)
  if (typeof value === "object") {
    const candidate = value as { toFixed?: unknown; toString(): string }
    // Prisma Decimal — has toFixed but is not a number.
    if (typeof candidate.toFixed === "function") return candidate.toString()
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue
      out[key] = jsonify(item)
    }
    return out
  }
  return value
}

/// Field-level changes only, so a history view can say "amount 500 → 650"
/// without diffing two whole blobs at read time.
function diffOf(before: unknown, after: unknown) {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") {
    return null
  }
  const a = before as Record<string, unknown>
  const b = after as Record<string, unknown>
  const changed: Record<string, { from: unknown; to: unknown }> = {}
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
export async function recordAudit(tx: PrismaTransaction, input: AuditInput) {
  const context = getContext()
  const before = jsonify(input.before)
  const after = jsonify(input.after)

  await tx.auditLog.create({
    data: {
      traceId: context?.traceId ?? "untraced",
      requestId: context?.requestId,
      actorUserId: context?.userId,
      actorClerkId: context?.clerkId,
      groupId: input.groupId ?? undefined,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: before === null ? undefined : (before as object),
      after: after === null ? undefined : (after as object),
      diff: (diffOf(before, after) as object | null) ?? undefined,
      route: context?.route,
      ip: context?.ip,
      userAgent: context?.userAgent,
    },
  })

  log.info("audit.record", {
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
  })
}
