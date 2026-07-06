import type { Expense, Participant } from './database.types'

export type Balance = {
  participant_id: string
  name: string
  amount: number // positive: they are owed money. negative: they owe money.
}

export type Settlement = {
  from_id: string
  from_name: string
  to_id: string
  to_name: string
  amount: number
}

/**
 * Convert an expense amount to the trip's base currency using the given rates.
 * `rates` maps currency code -> rate relative to base currency.
 * e.g. if base is EUR and 1 GBP = 1.16 EUR, then rates["GBP"] = 1.16
 */
function toBase(
  amount: number,
  currency: string,
  baseCurrency: string,
  rates: Record<string, number>,
): number {
  if (currency === baseCurrency) return amount
  const rate = rates[currency]
  if (!rate) {
    // Fall back to 1:1 if unknown; UI should warn about missing rate.
    return amount
  }
  return amount * rate
}

/**
 * Compute per-participant net balances in base currency.
 * Positive = they are owed. Negative = they owe.
 */
export function computeBalances(
  participants: Participant[],
  expenses: Expense[],
  baseCurrency: string,
  rates: Record<string, number>,
): Balance[] {
  const totals = new Map<string, number>()
  for (const p of participants) totals.set(p.id, 0)

  for (const exp of expenses) {
    const amountBase = toBase(exp.amount, exp.currency, baseCurrency, rates)

    // Credit the payer
    totals.set(exp.paid_by, (totals.get(exp.paid_by) ?? 0) + amountBase)

    // Debit those who owe a share
    if (exp.split_type === 'even') {
      const share = amountBase / participants.length
      for (const p of participants) {
        totals.set(p.id, (totals.get(p.id) ?? 0) - share)
      }
    } else {
      // Unequal: `splits` gives per-participant amounts IN ORIGINAL currency.
      for (const s of exp.splits) {
        const shareBase = toBase(s.amount, exp.currency, baseCurrency, rates)
        totals.set(s.participant_id, (totals.get(s.participant_id) ?? 0) - shareBase)
      }
    }
  }

  return participants.map((p) => ({
    participant_id: p.id,
    name: p.name,
    amount: round2(totals.get(p.id) ?? 0),
  }))
}

/**
 * Compute the minimum set of transactions to settle up.
 * Greedy: repeatedly match the biggest creditor with the biggest debtor.
 * Not always mathematically optimal, but simple and produces near-optimal results
 * for typical group sizes (<20 people).
 */
export function computeSettlements(balances: Balance[]): Settlement[] {
  const epsilon = 0.01

  const creditors = balances
    .filter((b) => b.amount > epsilon)
    .map((b) => ({ ...b }))
  const debtors = balances
    .filter((b) => b.amount < -epsilon)
    .map((b) => ({ ...b, amount: -b.amount })) // flip sign

  const settlements: Settlement[] = []

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0]
    const debtor = debtors[0]

    const amount = Math.min(creditor.amount, debtor.amount)

    settlements.push({
      from_id: debtor.participant_id,
      from_name: debtor.name,
      to_id: creditor.participant_id,
      to_name: creditor.name,
      amount: round2(amount),
    })

    creditor.amount -= amount
    debtor.amount -= amount

    if (creditor.amount < epsilon) creditors.shift()
    if (debtor.amount < epsilon) debtors.shift()
  }

  return settlements
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
