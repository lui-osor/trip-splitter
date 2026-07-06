import { deleteExpense } from '../lib/api'
import { formatMoney } from '../lib/currency'
import type { Expense, Participant } from '../lib/database.types'

type Props = {
  expenses: Expense[]
  participants: Participant[]
  onDeleted: () => void
}

export function ExpenseList({ expenses, participants, onDeleted }: Props) {
  const nameOf = (id: string) =>
    participants.find((p) => p.id === id)?.name ?? 'Unknown'

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return
    try {
      await deleteExpense(id)
      onDeleted()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="card text-center py-10">
        <p className="text-[var(--color-ink-muted)] text-sm">
          No expenses yet. Add your first one above.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {expenses.map((exp) => (
        <div
          key={exp.id}
          className="card flex items-start justify-between !p-4 hover:border-[var(--color-border)] transition-colors group"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{exp.description}</p>
            <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
              {nameOf(exp.paid_by)} paid ·{' '}
              {exp.split_type === 'even'
                ? 'split equally'
                : `split among ${exp.splits.length}`}
            </p>
          </div>
          <div className="text-right ml-4 flex flex-col items-end">
            <span className="font-medium tabular-nums">
              {formatMoney(exp.amount, exp.currency)}
            </span>
            <button
              className="text-xs text-[var(--color-ink-muted)] hover:text-red-700 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleDelete(exp.id)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
