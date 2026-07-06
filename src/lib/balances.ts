import { convert } from './currency'
import type { Expense, TripMember } from './database.types'

export type NetBalance = {
  memberId: string
  name: string
  color: string
  /** Positive = they are owed. Negative = they owe. In base currency. */
  amount: number
}

export type Settlement = {
  fromId: string
  fromName: string
  fromColor: string
  toId: string
  toName: string
  toColor: string
  amount: number
}

/**
 * Compute per-member net balances in the base currency.
 * Positive amounts mean the member is owed money; negative means they owe.
 * Uses `ratesInBase` where `rates[X] = value of 1 unit of X in base currency`.
 */
export function computeBalances(
  members: TripMember[],
  expenses: Expense[],
  baseCurrency: string,
  ratesInBase: Record<string, number>,
): NetBalance[] {
  const totals = new Map<string, number>()
  for (const m of members) totals.set(m.id, 0)

  for (const exp of expenses) {
    const totalBase = convert(exp.amount, exp.currency, baseCurrency, ratesInBase)

    // Credit the payer for the full amount
    totals.set(exp.paid_by, (totals.get(exp.paid_by) ?? 0) + totalBase)

    // Debit those who owe a share
    if (exp.split_type === 'even') {
      // If `splits` is populated, use it (means "even among a subset");
      // otherwise fall back to splitting across all members.
      if (exp.splits && exp.splits.length > 0) {
        const share = totalBase / exp.splits.length
        for (const s of exp.splits) {
          totals.set(s.participant_id, (totals.get(s.participant_id) ?? 0) - share)
        }
      } else {
        const share = totalBase / members.length
        for (const m of members) {
          totals.set(m.id, (totals.get(m.id) ?? 0) - share)
        }
      }
    } else {
      // Unequal: `splits[i].amount` is in the expense's original currency.
      for (const s of exp.splits) {
        const shareBase = convert(s.amount, exp.currency, baseCurrency, ratesInBase)
        totals.set(s.participant_id, (totals.get(s.participant_id) ?? 0) - shareBase)
      }
    }
  }

  return members.map((m) => ({
    memberId: m.id,
    name: m.name,
    color: m.color,
    amount: round2(totals.get(m.id) ?? 0),
  }))
}

/**
 * Greedy min-transaction settle-up: match biggest creditor with biggest debtor.
 */
export function computeSettlements(balances: NetBalance[]): Settlement[] {
  const epsilon = 0.01
  const creditors = balances.filter((b) => b.amount > epsilon).map((b) => ({ ...b }))
  const debtors = balances
    .filter((b) => b.amount < -epsilon)
    .map((b) => ({ ...b, amount: -b.amount }))

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const out: Settlement[] = []
  while (creditors.length > 0 && debtors.length > 0) {
    const c = creditors[0]
    const d = debtors[0]
    const pay = Math.min(c.amount, d.amount)
    out.push({
      fromId: d.memberId,
      fromName: d.name,
      fromColor: d.color,
      toId: c.memberId,
      toName: c.name,
      toColor: c.color,
      amount: round2(pay),
    })
    c.amount -= pay
    d.amount -= pay
    if (c.amount < epsilon) creditors.shift()
    if (d.amount < epsilon) debtors.shift()
  }

  return out
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
