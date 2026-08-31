import { z } from "zod"

import type { UserRow } from "@/lib/db-types"
import { ForbiddenError, UnauthorizedError, getOrCreateUser } from "@/lib/auth"
import { log } from "@/lib/observability/logger"
import { withRequestContext } from "@/lib/observability/request"
import { withSpan } from "@/lib/observability/span"

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

/// Thrown by services for problems the user can act on — shown verbatim.
export class ActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ActionError"
  }
}

/// The single door every mutation walks through. It enters the trace context,
/// resolves the actor, validates the input, opens a span and normalises errors —
/// so authorisation, logging and error shape are uniform by construction rather
/// than by discipline.
export function defineAction<Schema extends z.ZodType, Result>(
  name: string,
  schema: Schema,
  handler: (input: z.output<Schema>, user: UserRow) => Promise<Result>
) {
  return async (rawInput: z.input<Schema>): Promise<ActionResult<Result>> => {
    return withRequestContext(`action:${name}`, async () => {
      try {
        const parsed = schema.safeParse(rawInput)
        if (!parsed.success) {
          const fieldErrors = z.flattenError(parsed.error).fieldErrors
          log.warn("action.invalid", { action: name, fieldErrors })
          return {
            ok: false,
            error: "Please check the highlighted fields.",
            fieldErrors: fieldErrors as Record<string, string[]>,
          }
        }

        const user = await withSpan("auth.resolve", () => getOrCreateUser())
        const data = await withSpan(`action.${name}`, () =>
          handler(parsed.data, user)
        )

        return { ok: true, data }
      } catch (error) {
        return { ok: false, error: toMessage(error, name) }
      }
    })
  }
}

function toMessage(error: unknown, action: string) {
  if (
    error instanceof ActionError ||
    error instanceof ForbiddenError ||
    error instanceof UnauthorizedError
  ) {
    return error.message
  }
  // Anything unrecognised is a bug, not a user problem: log it in full and show
  // a message that does not leak internals.
  log.error("action.unhandled", { action, error })
  return "Something went wrong. Please try again."
}
