import type { Minor } from "@/lib/money"

/// Ledger rows reduced to the only shape balance maths needs. Amounts are
/// already in the group's currency (Expense.groupAmountMinor), so this module
/// never touches exchange rates.
export type LedgerEntry = {
  /// Positive: this person put money in. Negative: this person consumed it.
  userId: string
  amountMinor: Minor
}

export type NetBalance = {
  userId: string
  /// Positive means the group owes them; negative means they owe the group.
  netMinor: Minor
}

export type Transfer = {
  fromUserId: string
  toUserId: string
  amountMinor: Minor
}

export type GroupLedger = {
  expenses: {
    payers: LedgerEntry[]
    splits: LedgerEntry[]
  }[]
  settlements: {
    fromUserId: string
    toUserId: string
    amountMinor: Minor
  }[]
}

/// net = paid − owed − sent + received. A settlement is just the mirror of an
/// expense: paying someone reduces what you are owed.
export function netBalances(ledger: GroupLedger): NetBalance[] {
  const net = new Map<string, Minor>()
  const add = (userId: string, amount: Minor) =>
    net.set(userId, (net.get(userId) ?? 0) + amount)

  for (const expense of ledger.expenses) {
    for (const payer of expense.payers) add(payer.userId, payer.amountMinor)
    for (const split of expense.splits) add(split.userId, -split.amountMinor)
  }
  for (const settlement of ledger.settlements) {
    add(settlement.fromUserId, settlement.amountMinor)
    add(settlement.toUserId, -settlement.amountMinor)
  }

  return [...net.entries()]
    .map(([userId, netMinor]) => ({ userId, netMinor }))
    .sort((a, b) => b.netMinor - a.netMinor || a.userId.localeCompare(b.userId))
}

/// Who owes whom, without simplification: the honest history of each pair.
/// Every expense is attributed proportionally to the people who actually paid
/// it, so "you owe Asha ₹450" traces back to real transactions.
export function pairwiseBalances(ledger: GroupLedger): Transfer[] {
  const pairs = new Map<string, Minor>()

  const addPair = (debtor: string, creditor: string, amount: Minor) => {
    if (debtor === creditor || amount === 0) return
    // Store each pair under one canonical key so opposite directions cancel.
    const [a, b] = [debtor, creditor].sort()
    const signed = debtor === a ? amount : -amount
    pairs.set(`${a}|${b}`, (pairs.get(`${a}|${b}`) ?? 0) + signed)
  }

  for (const expense of ledger.expenses) {
    const paidTotal = expense.payers.reduce((s, p) => s + p.amountMinor, 0)
    if (paidTotal === 0) continue
    for (const split of expense.splits) {
      for (const payer of expense.payers) {
        // Split the debt across payers in proportion to what each put in.
        const share = Math.round(
          (split.amountMinor * payer.amountMinor) / paidTotal
        )
        addPair(split.userId, payer.userId, share)
      }
    }
  }
  for (const settlement of ledger.settlements) {
    addPair(settlement.toUserId, settlement.fromUserId, settlement.amountMinor)
  }

  const transfers: Transfer[] = []
  for (const [key, amount] of pairs) {
    if (amount === 0) continue
    const [a, b] = key.split("|") as [string, string]
    transfers.push(
      amount > 0
        ? { fromUserId: a, toUserId: b, amountMinor: amount }
        : { fromUserId: b, toUserId: a, amountMinor: -amount }
    )
  }
  return transfers.sort((x, y) => y.amountMinor - x.amountMinor)
}

/// Greedy min-cash-flow: repeatedly settle the biggest debtor against the
/// biggest creditor. Preserves every member's net position while producing at
/// most n−1 transfers instead of one per pair.
export function simplifyDebts(balances: NetBalance[]): Transfer[] {
  const creditors = balances
    .filter((entry) => entry.netMinor > 0)
    .map((entry) => ({ ...entry }))
  const debtors = balances
    .filter((entry) => entry.netMinor < 0)
    .map((entry) => ({ ...entry, netMinor: -entry.netMinor }))

  // Deterministic ordering so the settle-up screen does not reshuffle between
  // renders for two members who owe the same amount.
  const byAmount = (a: NetBalance, b: NetBalance) =>
    b.netMinor - a.netMinor || a.userId.localeCompare(b.userId)
  creditors.sort(byAmount)
  debtors.sort(byAmount)

  const transfers: Transfer[] = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!
    const creditor = creditors[j]!
    const amount = Math.min(debtor.netMinor, creditor.netMinor)

    if (amount > 0) {
      transfers.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amountMinor: amount,
      })
    }

    debtor.netMinor -= amount
    creditor.netMinor -= amount
    if (debtor.netMinor === 0) i += 1
    if (creditor.netMinor === 0) j += 1
  }

  return transfers
}

/// What one member sees on their own row: a single signed number.
export function netFor(balances: NetBalance[], userId: string): Minor {
  return balances.find((entry) => entry.userId === userId)?.netMinor ?? 0
}
