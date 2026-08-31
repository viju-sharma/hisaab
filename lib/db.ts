import postgres from "@prisma/orm-postgres/runtime"

import type { Contract } from "@/generated/prisma8/contract"
import contractJson from "@/generated/prisma8/contract.json" with { type: "json" }
import { tracingMiddleware } from "@/lib/observability/db-tracing"

function createClient() {
  return postgres<Contract>({
    contractJson,
    url: process.env.DATABASE_URL,
    middleware: [tracingMiddleware],
  })
}

const globalForDb = globalThis as unknown as {
  db?: ReturnType<typeof createClient>
}

/// A module-level singleton: the pool lives for the process, and is never
/// closed from request code. Short scripts (the seed) close it themselves.
export const db = globalForDb.db ?? createClient()

if (process.env.NODE_ENV !== "production") globalForDb.db = db

/// The transactional context handed to service functions — the same `orm` and
/// `sql` surfaces as `db`, riding one transaction. Derived from the client so
/// it stays correct as the contract changes.
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

/// Prisma 7's `P2002` for a unique-constraint collision. Prisma 8 surfaces the
/// driver's error, so the check is on Postgres' own SQLSTATE.
export function isUniqueViolation(error: unknown): boolean {
  for (let cause: unknown = error, depth = 0; cause && depth < 4; depth += 1) {
    if ((cause as { code?: string }).code === "23505") return true
    cause = (cause as { cause?: unknown }).cause
  }
  return false
}
