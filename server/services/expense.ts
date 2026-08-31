import "server-only"

import { ActionError } from "@/lib/action"
import { convertMinor } from "@/lib/money"
import { prisma } from "@/lib/prisma"
import {
  SplitError,
  allocateByWeight,
  assertPayersCoverTotal,
  computeSplits,
} from "@/lib/split"
import type { CreateExpenseInput } from "@/lib/validation"

export type Line = { userId: string; amountMinor: number; groupAmountMinor: number }

export type BuiltExpense = {
  groupAmountMinor: number
  payers: Line[]
  splits: (Line & { weight?: number; percentBp?: number })[]
  memberIds: string[]
}

/// Turns a submitted form into ledger lines. Splits are resolved in the
/// expense's own currency (what the user typed), then the group-currency figures
/// are allocated from the converted total by the same weights — so both columns
/// sum exactly to their own total and no rounding escapes.
export async function buildExpense(
  input: CreateExpenseInput,
  groupCurrency: string
): Promise<BuiltExpense> {
  const members = await prisma.groupMember.findMany({
    where: { groupId: input.groupId, leftAt: null },
    select: { userId: true },
  })
  const memberIds = members.map((member) => member.userId)
  const memberSet = new Set(memberIds)

  const referenced = new Set<string>([
    ...input.payers.map((payer) => payer.userId),
    ...participantsOf(input),
  ])
  for (const userId of referenced) {
    if (!memberSet.has(userId)) {
      throw new ActionError("Someone in this expense is not in the group.")
    }
  }

  try {
    assertPayersCoverTotal(input.amountMinor, input.payers, input.currency)
    const splits = computeSplits(input.amountMinor, input.split, input.currency)

    const groupTotal = convertMinor(
      input.amountMinor,
      input.currency,
      groupCurrency,
      input.exchangeRate
    )

    const payerGroupAmounts = byUser(
      allocateByWeight(
        groupTotal,
        input.payers.map((payer) => ({
          userId: payer.userId,
          weight: payer.amountMinor,
        }))
      )
    )
    const splitGroupAmounts = byUser(
      allocateByWeight(
        groupTotal,
        splits.map((split) => ({
          userId: split.userId,
          weight: split.amountMinor,
        }))
      )
    )

    return {
      groupAmountMinor: groupTotal,
      payers: input.payers.map((payer) => ({
        userId: payer.userId,
        amountMinor: payer.amountMinor,
        groupAmountMinor: payerGroupAmounts.get(payer.userId) ?? 0,
      })),
      splits: splits.map((split) => ({
        userId: split.userId,
        amountMinor: split.amountMinor,
        groupAmountMinor: splitGroupAmounts.get(split.userId) ?? 0,
        weight: split.weight,
        percentBp: split.percentBp,
      })),
      memberIds,
    }
  } catch (error) {
    // Split problems are the user's to fix, so they surface verbatim.
    if (error instanceof SplitError) throw new ActionError(error.message)
    throw error
  }
}

function participantsOf(input: CreateExpenseInput): string[] {
  switch (input.split.method) {
    case "EQUAL":
      return input.split.participants
    case "SHARES":
      return input.split.shares.map((entry) => entry.userId)
    case "PERCENT":
      return input.split.percents.map((entry) => entry.userId)
    case "EXACT":
      return input.split.amounts.map((entry) => entry.userId)
    case "ITEMISED":
      return input.split.items.flatMap((item) => item.participants)
  }
}

function byUser(allocations: { userId: string; amountMinor: number }[]) {
  return new Map(allocations.map((entry) => [entry.userId, entry.amountMinor]))
}
