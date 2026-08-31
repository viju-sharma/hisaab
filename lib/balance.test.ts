import { describe, expect, it } from "vitest"

import {
  type GroupLedger,
  netBalances,
  pairwiseBalances,
  simplifyDebts,
} from "./balance"
import { computeSplits } from "./split"

function equalExpense(total: number, payer: string, members: string[]) {
  return {
    payers: [{ userId: payer, amountMinor: total }],
    splits: computeSplits(total, { method: "EQUAL", participants: members }),
  }
}

const members = ["asha", "biju", "chandra"]

describe("netBalances", () => {
  it("nets to zero across the group", () => {
    const ledger: GroupLedger = {
      expenses: [
        equalExpense(90_000, "asha", members),
        equalExpense(30_000, "biju", members),
      ],
      settlements: [],
    }
    const balances = netBalances(ledger)
    expect(balances.reduce((s, b) => s + b.netMinor, 0)).toBe(0)
    // Asha paid 900; the group spent 1200, so her share is 400 → owed 500.
    expect(balances.find((b) => b.userId === "asha")!.netMinor).toBe(50_000)
  })

  it("treats a settlement as the mirror of an expense", () => {
    const ledger: GroupLedger = {
      expenses: [equalExpense(30_000, "asha", ["asha", "biju"])],
      settlements: [
        { fromUserId: "biju", toUserId: "asha", amountMinor: 15_000 },
      ],
    }
    expect(netBalances(ledger).every((b) => b.netMinor === 0)).toBe(true)
  })

  it("handles multiple payers on one expense", () => {
    const ledger: GroupLedger = {
      expenses: [
        {
          payers: [
            { userId: "asha", amountMinor: 60_000 },
            { userId: "biju", amountMinor: 30_000 },
          ],
          splits: computeSplits(90_000, {
            method: "EQUAL",
            participants: members,
          }),
        },
      ],
      settlements: [],
    }
    const balances = netBalances(ledger)
    expect(balances.reduce((s, b) => s + b.netMinor, 0)).toBe(0)
    expect(balances.find((b) => b.userId === "chandra")!.netMinor).toBe(-30_000)
  })
})

describe("pairwiseBalances", () => {
  it("cancels opposite debts between the same pair", () => {
    const ledger: GroupLedger = {
      expenses: [
        equalExpense(20_000, "asha", ["asha", "biju"]),
        equalExpense(20_000, "biju", ["asha", "biju"]),
      ],
      settlements: [],
    }
    expect(pairwiseBalances(ledger)).toEqual([])
  })

  it("reports the direction of a one-sided debt", () => {
    const ledger: GroupLedger = {
      expenses: [equalExpense(20_000, "asha", ["asha", "biju"])],
      settlements: [],
    }
    expect(pairwiseBalances(ledger)).toEqual([
      { fromUserId: "biju", toUserId: "asha", amountMinor: 10_000 },
    ])
  })
})

describe("simplifyDebts", () => {
  it("preserves every net position", () => {
    const balances = [
      { userId: "asha", netMinor: 60_000 },
      { userId: "biju", netMinor: -10_000 },
      { userId: "chandra", netMinor: -50_000 },
    ]
    const transfers = simplifyDebts(balances)

    // Paying moves a debtor's net up; being paid moves a creditor's net down.
    // Applying every transfer must leave the whole group at zero.
    const remaining = new Map(balances.map((b) => [b.userId, b.netMinor]))
    for (const t of transfers) {
      remaining.set(t.fromUserId, remaining.get(t.fromUserId)! + t.amountMinor)
      remaining.set(t.toUserId, remaining.get(t.toUserId)! - t.amountMinor)
    }
    for (const balance of balances) {
      expect(remaining.get(balance.userId)).toBe(0)
    }
  })

  it("needs at most n-1 transfers", () => {
    const balances = [
      { userId: "a", netMinor: 50_000 },
      { userId: "b", netMinor: 30_000 },
      { userId: "c", netMinor: -40_000 },
      { userId: "d", netMinor: -40_000 },
    ]
    expect(simplifyDebts(balances).length).toBeLessThanOrEqual(3)
  })

  it("produces nothing when everyone is square", () => {
    expect(simplifyDebts([{ userId: "a", netMinor: 0 }])).toEqual([])
  })

  it("is deterministic across runs", () => {
    const balances = [
      { userId: "zoe", netMinor: 20_000 },
      { userId: "ali", netMinor: -10_000 },
      { userId: "mia", netMinor: -10_000 },
    ]
    expect(simplifyDebts(balances)).toEqual(simplifyDebts(balances))
  })
})
