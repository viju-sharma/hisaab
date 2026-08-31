import type { SqlMiddleware } from "@prisma/orm-postgres/family-runtime"

import { getContext } from "./context"
import { log } from "./logger"

/// Tables the tracer stays quiet about. Both are written on nearly every
/// mutation, so tracing them buries the gesture that caused them in noise.
/// Audit rows are still written explicitly at the service layer, inside the
/// same transaction as the mutation, because only the service knows the
/// before-state and the business meaning of a change.
const SILENT = new Set(["AuditLog", "Activity"])

/// `SqlExecutionPlan` is not on the façade's export surface, so the hook's own
/// signature is the source of truth for these.
type QueryHook = NonNullable<SqlMiddleware["afterQuery"]>
type Plan = Parameters<QueryHook>[0]
type HookContext = Parameters<QueryHook>[2]

/// Prisma 8 has no `$extends`, so the query-level tracing that used to hang off
/// the client extension is a runtime middleware instead. It observes at the
/// plan level rather than the model level: the label comes from the table the
/// plan touches, and the duration comes from the runtime rather than a timer
/// this module keeps, so nothing has to be correlated across hooks.
function tableOf(plan: Plan): string {
  const ast = plan.ast as unknown as Record<
    string,
    { name?: string } | undefined
  >
  const source = ast.from ?? ast.into ?? ast.table ?? ast.target
  return source?.name ?? "sql"
}

function trace(
  plan: Plan,
  ctx: HookContext,
  outcome: { rows: number; latencyMs: number; completed: boolean }
) {
  const table = tableOf(plan)
  if (SILENT.has(table)) return

  const verb = (plan.ast as unknown as { kind?: string }).kind ?? "query"
  const label = `db.${table}.${verb}`
  const fields = {
    durationMs: Math.round(outcome.latencyMs * 100) / 100,
    rows: outcome.rows,
    ...(ctx.scope === "transaction" ? { tx: true } : {}),
  }

  if (outcome.completed) log.debug(label, fields)
  else log.error(`${label}.fail`, fields)
}

export const tracingMiddleware: SqlMiddleware = {
  name: "hisaab-tracing",
  familyId: "sql",

  /// Reads. `depth` indents the dev logger so one request reads as a tree; it
  /// is bumped and unwound around the query the same way the old extension did.
  async beforeQuery() {
    const context = getContext()
    if (context) context.depth += 1
  },
  async afterQuery(plan, result, ctx) {
    const context = getContext()
    if (context) context.depth -= 1
    trace(plan, ctx, {
      rows: result.rowCount,
      latencyMs: result.latencyMs,
      completed: result.completed,
    })
  },

  /// Writes, which report affected rows rather than streaming them.
  async beforeExecute() {
    const context = getContext()
    if (context) context.depth += 1
  },
  async afterExecute(plan, result, ctx) {
    const context = getContext()
    if (context) context.depth -= 1
    trace(plan, ctx, {
      rows: result.completed ? (result.stats.affectedRows ?? 0) : 0,
      latencyMs: result.latencyMs,
      completed: result.completed,
    })
  },
}
