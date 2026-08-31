import { Prisma } from "@/app/generated/prisma/client"

import { getContext } from "./context"
import { log } from "./logger"

/// Models the extension must never instrument: writing a log or audit row from
/// inside a query hook would re-enter the hook and recurse forever.
const SILENT = new Set(["AuditLog", "Activity"])

/// Tracing only. Audit rows are written explicitly at the service layer, inside
/// the same transaction as the mutation, because only the service knows the
/// before-state and the business meaning of a change.
export const tracingExtension = Prisma.defineExtension({
  name: "hisaab-tracing",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (SILENT.has(model)) return query(args)

        const context = getContext()
        const startedAt = performance.now()
        const label = `db.${model}.${operation}`

        if (context) context.depth += 1
        try {
          const result = await query(args)
          if (context) context.depth -= 1
          log.debug(label, {
            durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
            rows: Array.isArray(result) ? result.length : result ? 1 : 0,
          })
          return result
        } catch (error) {
          if (context) context.depth -= 1
          log.error(`${label}.fail`, {
            durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
            error,
          })
          throw error
        }
      },
    },
  },
})
