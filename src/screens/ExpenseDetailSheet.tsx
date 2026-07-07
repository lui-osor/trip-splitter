import { Avatar } from '../components/Avatar'
import { CategoryIcon } from '../components/CategoryIcon'
import { Sheet } from '../components/Sheet'
import { deleteExpense } from '../lib/api'
import { categoryMeta } from '../lib/categories'
import { convert, formatMoney } from '../lib/currency'
import { errorMessage } from '../lib/errors'
import type { Expense, TripMember } from '../lib/database.types'

type Props = {
  open: boolean
  expense: Expense | null
  members: TripMember[]
  baseCurrency: string
  ratesInBase: Record<string, number>
  onClose: () => void
  onDeleted: () => void
  onEdit: () => void
}

export function ExpenseDetailSheet({
  open,
  expense,
  members,
  baseCurrency,
  ratesInBase,
  onClose,
  onDeleted,
  onEdit,
}: Props) {
  if (!expense) {
    return <Sheet open={open} onClose={onClose} title="Expense">{null}</Sheet>
  }

  const cat = categoryMeta(expense.category)
  const payer = members.find((m) => m.id === expense.paid_by)
  const converted = convert(
    expense.amount,
    expense.currency,
    baseCurrency,
    ratesInBase,
  )
  const showConverted = expense.currency !== baseCurrency

  const shareEntries = (() => {
    // For even splits with empty splits[], distribute across all members.
    if (expense.split_type === 'even' && (expense.splits?.length ?? 0) === 0) {
      const share = expense.amount / members.length
      return members.map((m) => ({
        participant_id: m.id,
        amount: share,
      }))
    }
    return expense.splits
  })()

  async function handleDelete() {
    if (!expense) return
    if (!confirm('Delete this expense?')) return
    try {
      await deleteExpense(expense.id)
      onDeleted()
    } catch (err) {
      alert(errorMessage(err, 'Failed to delete'))
    }
  }

  return (
    <Sheet open={open} onClose={onClose} maxHeight="90%">
      <div className="text-center pb-4 border-b border-[var(--color-divider)]">
        <span
          className="inline-flex items-center justify-center rounded-[18px] w-[60px] h-[60px]"
          style={{ background: cat.bg }}
        >
          <CategoryIcon category={expense.category} size={26} color={cat.color} />
        </span>
        <div className="font-semibold text-[20px] tracking-tight mt-3">
          {expense.description}
        </div>
        <div className="text-[13px] text-[var(--color-fg-2)] mt-0.5">
          {payer?.name ?? '?'} paid · {cat.label}
        </div>
        <div className="font-semibold text-[32px] tracking-tight mt-3">
          {formatMoney(expense.amount, expense.currency)}
        </div>
        {showConverted && (
          <div className="text-[13px] text-[var(--color-fg-3)]">
            ≈ {formatMoney(converted, baseCurrency)}
          </div>
        )}
      </div>

      <div className="text-[13px] font-semibold text-[var(--color-fg-2)] mt-5 mb-2">
        Split
      </div>
      <div>
        {shareEntries.map((s) => {
          const m = members.find((mm) => mm.id === s.participant_id)
          return (
            <div
              key={s.participant_id}
              className="flex items-center gap-3 py-2.5 border-b border-[var(--color-divider)] last:border-b-0"
            >
              <Avatar
                name={m?.name ?? '?'}
                color={m?.color ?? '#D7D4CC'}
                size={32}
              />
              <span className="flex-1 text-[14.5px] font-medium">
                {m?.name ?? 'Unknown'}
              </span>
              <span className="text-[14.5px] font-semibold text-[var(--color-fg-2)] tabular-nums">
                {formatMoney(s.amount, expense.currency)}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2.5 mt-6">
        <button
          onClick={onEdit}
          className="no-ring flex-1 py-3.5 rounded-full bg-[var(--color-core-purple)] text-white font-semibold text-[15px] cursor-pointer border-none"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="no-ring flex-1 py-3.5 rounded-full bg-transparent text-[var(--color-danger)] font-semibold text-[15px] cursor-pointer border-[1.5px] border-[var(--color-danger)]"
        >
          Delete
        </button>
      </div>
    </Sheet>
  )
}
