import { describe, expect, it } from "vitest"

import { sumMinor } from "./money"
import {
  SplitError,
  allocateByWeight,
  assertPayersCoverTotal,
  computeSplits,
} from "./split"

const total = (allocations: { amountMinor: number }[]) =>
  sumMinor(allocations.map((a) => a.amountMinor))

describe("allocateByWeight", () => {
  it("always sums back to the total", () => {
    // ₹100 across three people is the classic case: 33.33 + 33.33 + 33.33 ≠ 100.
    const result = allocateByWeight(10_000, [
      { userId: "a", weight: 1 },
      { userId: "b", weight: 1 },
      { userId: "c", weight: 1 },
    ])
    expect(total(result)).toBe(10_000)
    expect(result.map((r) => r.amountMinor).sort()).toEqual([3333, 3333, 3334])
  })

  it("holds for every total from 1 to 500 paise across 2-7 people", () => {
    for (let people = 2; people <= 7; people += 1) {
      const weights = Array.from({ length: people }, (_, i) => ({
        userId: `u${i}`,
        weight: 1,
      }))
      for (let amount = 1; amount <= 500; amount += 1) {
        expect(total(allocateByWeight(amount, weights))).toBe(amount)
      }
    }
  })

  it("is deterministic for equal remainders", () => {
    const weights = [
      { userId: "zoe", weight: 1 },
      { userId: "ali", weight: 1 },
      { userId: "mia", weight: 1 },
    ]
    const first = allocateByWeight(100, weights)
    const second = allocateByWeight(100, weights)
    expect(first).toEqual(second)
    // The extra paisa goes to the lowest userId, not to whoever came first.
    expect(first.find((r) => r.userId === "ali")!.amountMinor).toBe(34)
  })

  it("respects uneven shares", () => {
    const result = allocateByWeight(10_000, [
      { userId: "a", weight: 3 },
      { userId: "b", weight: 1 },
    ])
    expect(result.find((r) => r.userId === "a")!.amountMinor).toBe(7500)
    expect(total(result)).toBe(10_000)
  })

  it("refuses empty or zero-weight splits", () => {
    expect(() => allocateByWeight(100, [])).toThrow(SplitError)
    expect(() =>
      allocateByWeight(100, [{ userId: "a", weight: 0 }])
    ).toThrow(SplitError)
  })
})

describe("computeSplits", () => {
  it("splits equally", () => {
    const result = computeSplits(10_000, {
      method: "EQUAL",
      participants: ["a", "b", "c"],
    })
    expect(total(result)).toBe(10_000)
  })

  it("splits by percentage and keeps the input percentages", () => {
    const result = computeSplits(10_000, {
      method: "PERCENT",
      percents: [
        { userId: "a", percentBp: 3333 },
        { userId: "b", percentBp: 3333 },
        { userId: "c", percentBp: 3334 },
      ],
    })
    expect(total(result)).toBe(10_000)
    expect(result[0]!.percentBp).toBe(3333)
  })

  it("rejects percentages that miss 100%", () => {
    expect(() =>
      computeSplits(10_000, {
        method: "PERCENT",
        percents: [
          { userId: "a", percentBp: 5000 },
          { userId: "b", percentBp: 4000 },
        ],
      })
    ).toThrow(/not 100%/)
  })

  it("accepts exact amounts that add up and rejects those that do not", () => {
    expect(
      total(
        computeSplits(10_000, {
          method: "EXACT",
          amounts: [
            { userId: "a", amountMinor: 6000 },
            { userId: "b", amountMinor: 4000 },
          ],
        })
      )
    ).toBe(10_000)

    expect(() =>
      computeSplits(10_000, {
        method: "EXACT",
        amounts: [{ userId: "a", amountMinor: 6000 }],
      })
    ).toThrow(/unassigned/)
  })

  it("collapses itemised entries per person and still hits the total", () => {
    const result = computeSplits(10_000, {
      method: "ITEMISED",
      items: [
        { amountMinor: 3000, participants: ["a"] },
        { amountMinor: 7000, participants: ["a", "b", "c"] },
      ],
    })
    expect(total(result)).toBe(10_000)
    // 3000 alone plus a third of 7000 (rounded up by largest-remainder).
    expect(result.find((r) => r.userId === "a")!.amountMinor).toBe(5334)
  })
})

describe("assertPayersCoverTotal", () => {
  it("accepts multiple payers adding to the total", () => {
    expect(() =>
      assertPayersCoverTotal(10_000, [
        { userId: "a", amountMinor: 6000 },
        { userId: "b", amountMinor: 4000 },
      ])
    ).not.toThrow()
  })

  it("rejects a shortfall", () => {
    expect(() =>
      assertPayersCoverTotal(10_000, [{ userId: "a", amountMinor: 9000 }])
    ).toThrow(/short/)
  })
})
