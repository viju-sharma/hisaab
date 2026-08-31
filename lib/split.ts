import type { SplitMethod } from "@/lib/db-types"
import type { Minor } from "@/lib/money"
import { formatMoney, sumMinor } from "@/lib/money"

export class SplitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SplitError"
  }
}

export type Allocation = {
  userId: string
  amountMinor: Minor
  weight?: number
  percentBp?: number
}

/// Largest-remainder allocation: hand out the floor of each share, then give the
/// leftover minor units one at a time to whoever was rounded down hardest.
/// Guarantees `sum(result) === total` for any total and any weights — which is
/// the whole point, because ₹100 across three people has to add back to ₹100.
export function allocateByWeight(
  total: Minor,
  weights: { userId: string; weight: number }[]
): Allocation[] {
  if (weights.length === 0) throw new SplitError("Pick at least one person.")
  if (weights.some((entry) => entry.weight < 0)) {
    throw new SplitError("Shares cannot be negative.")
  }

  const totalWeight = weights.reduce((sum, entry) => sum + entry.weight, 0)
  if (totalWeight <= 0) throw new SplitError("Shares must add up to more than zero.")

  const sign = total < 0 ? -1 : 1
  const magnitude = Math.abs(total)

  const draft = weights.map((entry) => {
    const exact = (magnitude * entry.weight) / totalWeight
    const floor = Math.floor(exact)
    return { ...entry, floor, remainder: exact - floor }
  })

  let leftover = magnitude - draft.reduce((sum, entry) => sum + entry.floor, 0)

  // Sort by who lost the most to rounding; tie-break on userId so the same
  // inputs always produce the same output and the UI never flickers.
  const order = [...draft].sort(
    (a, b) => b.remainder - a.remainder || a.userId.localeCompare(b.userId)
  )
  const bonus = new Set<string>()
  for (const entry of order) {
    if (leftover <= 0) break
    bonus.add(entry.userId)
    leftover -= 1
  }

  return draft.map((entry) => ({
    userId: entry.userId,
    amountMinor: sign * (entry.floor + (bonus.has(entry.userId) ? 1 : 0)),
    weight: entry.weight,
  }))
}

export type SplitInput =
  | { method: Extract<SplitMethod, "EQUAL">; participants: string[] }
  | {
      method: Extract<SplitMethod, "SHARES">
      shares: { userId: string; weight: number }[]
    }
  | {
      method: Extract<SplitMethod, "PERCENT">
      percents: { userId: string; percentBp: number }[]
    }
  | {
      method: Extract<SplitMethod, "EXACT">
      amounts: { userId: string; amountMinor: Minor }[]
    }
  | {
      method: Extract<SplitMethod, "ITEMISED">
      items: { amountMinor: Minor; participants: string[] }[]
    }

/// Resolves any split mode into the one shape the ledger stores. EXACT and
/// ITEMISED validate rather than allocate — the user already decided.
export function computeSplits(
  total: Minor,
  input: SplitInput,
  currency = "INR"
): Allocation[] {
  switch (input.method) {
    case "EQUAL":
      return allocateByWeight(
        total,
        input.participants.map((userId) => ({ userId, weight: 1 }))
      ).map(({ userId, amountMinor }) => ({ userId, amountMinor }))

    case "SHARES":
      return allocateByWeight(total, input.shares)

    case "PERCENT": {
      const totalBp = input.percents.reduce((sum, e) => sum + e.percentBp, 0)
      if (totalBp !== 10_000) {
        throw new SplitError(
          `Percentages add up to ${(totalBp / 100).toFixed(2)}%, not 100%.`
        )
      }
      return allocateByWeight(
        total,
        input.percents.map((e) => ({ userId: e.userId, weight: e.percentBp }))
      ).map((allocation, index) => ({
        userId: allocation.userId,
        amountMinor: allocation.amountMinor,
        percentBp: input.percents[index]!.percentBp,
      }))
    }

    case "EXACT": {
      const assigned = sumMinor(input.amounts.map((e) => e.amountMinor))
      if (assigned !== total) {
        throw new SplitError(
          assigned < total
            ? `${describeGap(total - assigned, currency)} still unassigned.`
            : `${describeGap(assigned - total, currency)} over the total.`
        )
      }
      return input.amounts.map((e) => ({
        userId: e.userId,
        amountMinor: e.amountMinor,
      }))
    }

    case "ITEMISED": {
      const itemTotal = sumMinor(input.items.map((item) => item.amountMinor))
      if (itemTotal !== total) {
        throw new SplitError("Items do not add up to the expense total.")
      }
      // Each item is split equally among the people who consumed it; the
      // per-item remainders are allocated independently, so the sum still lands
      // exactly on the total.
      const perUser = new Map<string, Minor>()
      for (const item of input.items) {
        for (const share of allocateByWeight(
          item.amountMinor,
          item.participants.map((userId) => ({ userId, weight: 1 }))
        )) {
          perUser.set(
            share.userId,
            (perUser.get(share.userId) ?? 0) + share.amountMinor
          )
        }
      }
      return [...perUser.entries()].map(([userId, amountMinor]) => ({
        userId,
        amountMinor,
      }))
    }
  }
}

/// Payers are validated, never allocated — someone physically handed over money.
export function assertPayersCoverTotal(
  total: Minor,
  payers: { userId: string; amountMinor: Minor }[],
  currency = "INR"
) {
  if (payers.length === 0) throw new SplitError("Say who paid.")
  const paid = sumMinor(payers.map((payer) => payer.amountMinor))
  if (paid !== total) {
    throw new SplitError(
      paid < total
        ? `Payers are ${describeGap(total - paid, currency)} short of the total.`
        : `Payers are ${describeGap(paid - total, currency)} over the total.`
    )
  }
}

function describeGap(minor: Minor, currency: string) {
  return formatMoney(minor, currency)
}
