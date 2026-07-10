import { categoryMeta } from '../../lib/categories'
import { convert, formatMoney } from '../../lib/currency'
import type { Expense, TripMember } from '../../lib/database.types'
import { CategoryIcon } from '../../components/CategoryIcon'

type Props = {
  expenses: Expense[]
  members: TripMember[]
  baseCurrency: string
  ratesInBase: Record<string, number>
  onSelectExpense: (id: string) => void
}

export function FeedTab({
  expenses,
  members,
  baseCurrency,
  ratesInBase,
  onSelectExpense,
}: Props) {
  const memberName = (id: string) =>
    members.find((m) => m.id === id)?.name ?? 'Unknown'

  if (expenses.length === 0) {
    return (
      <div className="text-center pt-16 px-6">
        <h3 className="mb-1.5">No expenses yet</h3>
        <p className="text-[13.5px] text-[var(--color-fg-2)]">
          Tap the <span className="font-semibold text-[var(--color-core-purple)]">+</span> button to add the first one.
        </p>
      </div>
    )
  }

  return (
    <div className="pt-1">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[15px] font-semibold tracking-tight">Expenses</div>
        <div className="text-[12px] text-[var(--color-fg-3)] font-medium">
          {expenses.length} {expenses.length === 1 ? 'entry' : 'entries'}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {expenses.map((exp) => {
          const cat = categoryMeta(exp.category)
          const converted = convert(exp.amount, exp.currency, baseCurrency, ratesInBase)
          const showConverted = exp.currency !== baseCurrency
          return (
            <button
              key={exp.id}
              onClick={() => onSelectExpense(exp.id)}
              className="no-ring w-full flex items-center gap-3 py-3 px-3 bg-white border border-[var(--color-border)] rounded-2xl cursor-pointer text-left"
              style={{ boxShadow: '0 1px 2px rgba(30,0,47,0.06)' }}
            >
              <span
                className="w-[42px] h-[42px] rounded-[13px] flex-shrink-0 flex items-center justify-center"
                style={{ background: cat.bg }}
              >
                <CategoryIcon category={exp.category} size={20} color={cat.color} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold tracking-tight truncate">
                  {exp.description}
                </span>
                <span className="block text-[12.5px] text-[var(--color-fg-2)] mt-0.5">
                  {memberName(exp.paid_by)} paid ·{' '}
                  {exp.split_type === 'even'
                    ? 'split equally'
                    : `split among ${exp.splits.length}`}
                </span>
              </span>
              <span className="text-right flex-shrink-0">
                {/* Primary: amount in the user's selected display currency.
                    Secondary: the expense's original currency (what was actually paid). */}
                <span className="block text-[15px] font-semibold tracking-tight tabular-nums">
                  {formatMoney(converted, baseCurrency)}
                </span>
                {showConverted && (
                  <span className="block text-[11.5px] text-[var(--color-fg-3)] mt-0.5 tabular-nums">
                    {formatMoney(exp.amount, exp.currency)}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
