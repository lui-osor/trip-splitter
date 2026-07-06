import { useMemo } from 'react'
import { Avatar } from '../../components/Avatar'
import { categoryMeta, CATEGORIES } from '../../lib/categories'
import { convert, formatMoney } from '../../lib/currency'
import type { Expense, TripMember } from '../../lib/database.types'

type Props = {
  expenses: Expense[]
  members: TripMember[]
  displayCurrency: string
  ratesInDisplay: Record<string, number>
}

export function SummaryTab({
  expenses,
  members,
  displayCurrency,
  ratesInDisplay,
}: Props) {
  const total = useMemo(
    () =>
      expenses.reduce(
        (sum, e) => sum + convert(e.amount, e.currency, displayCurrency, ratesInDisplay),
        0,
      ),
    [expenses, displayCurrency, ratesInDisplay],
  )

  // By category
  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      const v = convert(e.amount, e.currency, displayCurrency, ratesInDisplay)
      map.set(e.category, (map.get(e.category) ?? 0) + v)
    }
    return CATEGORIES.filter((c) => (map.get(c.key) ?? 0) > 0)
      .map((c) => ({ ...c, amount: map.get(c.key) ?? 0 }))
      .sort((a, b) => b.amount - a.amount)
  }, [expenses, displayCurrency, ratesInDisplay])

  // Who paid what
  const byPayer = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      const v = convert(e.amount, e.currency, displayCurrency, ratesInDisplay)
      map.set(e.paid_by, (map.get(e.paid_by) ?? 0) + v)
    }
    return members
      .map((m) => ({ ...m, amount: map.get(m.id) ?? 0 }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount)
  }, [expenses, members, displayCurrency, ratesInDisplay])

  // By currency (original amounts, no conversion)
  const byCurrency = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      map.set(e.currency, (map.get(e.currency) ?? 0) + e.amount)
    }
    return Array.from(map.entries())
      .map(([code, amount]) => ({ code, amount }))
      .sort((a, b) => {
        // Put display currency first, then the rest by amount desc.
        if (a.code === displayCurrency) return -1
        if (b.code === displayCurrency) return 1
        return b.amount - a.amount
      })
  }, [expenses, displayCurrency])

  if (expenses.length === 0) {
    return (
      <div className="text-center pt-16 px-6">
        <h3 className="mb-1.5">Nothing to summarize yet</h3>
        <p className="text-[13.5px] text-[var(--color-fg-2)]">
          Add expenses to see the breakdown here.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* By category */}
      <div className="text-[15px] font-semibold tracking-tight mb-3">
        By category
      </div>
      <div className="bg-white border border-[var(--color-border)] rounded-[18px] p-4 mb-6"
        style={{ boxShadow: '0 1px 2px rgba(30,0,47,0.06)' }}
      >
        {byCategory.map((c, idx) => {
          const pct = total > 0 ? (c.amount / total) * 100 : 0
          return (
            <div
              key={c.key}
              className={idx < byCategory.length - 1 ? 'mb-3' : ''}
            >
              <div className="flex items-center justify-between text-[13.5px] mb-1.5">
                <span className="inline-flex items-center gap-2 font-medium">
                  <span
                    className="w-2.5 h-2.5 rounded-[3px]"
                    style={{ background: c.color }}
                  />
                  {c.label}
                </span>
                <span className="font-semibold tracking-tight tabular-nums">
                  {formatMoney(c.amount, displayCurrency)}
                </span>
              </div>
              <div className="h-1.5 bg-[var(--color-grey-100)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: c.color }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Who paid */}
      <div className="text-[15px] font-semibold tracking-tight mb-3">
        Who paid what
      </div>
      <div className="bg-white border border-[var(--color-border)] rounded-[18px] px-4 py-1 mb-6"
        style={{ boxShadow: '0 1px 2px rgba(30,0,47,0.06)' }}
      >
        {byPayer.map((p, idx) => (
          <div
            key={p.id}
            className={
              'flex items-center gap-3 py-2.5 ' +
              (idx < byPayer.length - 1
                ? 'border-b border-[var(--color-divider)]'
                : '')
            }
          >
            <Avatar name={p.name} color={p.color} size={34} />
            <span className="flex-1 text-[14.5px] font-medium">{p.name}</span>
            <span className="text-[14.5px] font-semibold tracking-tight tabular-nums">
              {formatMoney(p.amount, displayCurrency)}
            </span>
          </div>
        ))}
      </div>

      {/* By currency */}
      <div className="text-[15px] font-semibold tracking-tight mb-3">
        By currency
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {byCurrency.map((c) => (
          <div
            key={c.code}
            className="bg-white border border-[var(--color-border)] rounded-2xl px-4 py-3.5"
            style={{ boxShadow: '0 1px 2px rgba(30,0,47,0.06)' }}
          >
            <div className="text-[12px] font-semibold text-[var(--color-fg-3)] tracking-[0.04em]">
              {c.code}
            </div>
            <div className="text-[17px] font-semibold tracking-tight mt-1 tabular-nums">
              {formatMoney(c.amount, c.code)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
