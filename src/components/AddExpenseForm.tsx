import { useState } from 'react'
import { createExpense } from '../lib/api'
import { SUPPORTED_CURRENCIES } from '../lib/currency'
import type { Participant, SplitEntry } from '../lib/database.types'

type Props = {
  tripId: string
  participants: Participant[]
  baseCurrency: string
  onAdded: () => void
  onCancel: () => void
}

export function AddExpenseForm({
  tripId,
  participants,
  baseCurrency,
  onAdded,
  onCancel,
}: Props) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(baseCurrency)
  const [paidBy, setPaidBy] = useState(participants[0]?.id ?? '')
  const [splitType, setSplitType] = useState<'even' | 'unequal'>('even')
  const [participantsIncluded, setParticipantsIncluded] = useState<Set<string>>(
    new Set(participants.map((p) => p.id)),
  )
  const [unequalAmounts, setUnequalAmounts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleIncluded(pid: string) {
    setParticipantsIncluded((prev) => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid)
      else next.add(pid)
      return next
    })
  }

  async function handleSubmit() {
    setError(null)
    const parsedAmount = parseFloat(amount)
    if (!description.trim()) return setError('Add a description')
    if (!parsedAmount || parsedAmount <= 0) return setError('Enter a valid amount')
    if (!paidBy) return setError('Select who paid')

    let splits: SplitEntry[] = []
    if (splitType === 'even') {
      const included = participants.filter((p) => participantsIncluded.has(p.id))
      if (included.length === 0) return setError('At least one person must be included')
      // For even splits, we leave splits[] empty — balance logic uses all participants.
      // But if user excluded some, we must switch to unequal with equal shares among included.
      if (included.length !== participants.length) {
        const share = parsedAmount / included.length
        splits = included.map((p) => ({ participant_id: p.id, amount: share }))
      }
    } else {
      const total = Object.entries(unequalAmounts).reduce(
        (sum, [, v]) => sum + (parseFloat(v) || 0),
        0,
      )
      if (Math.abs(total - parsedAmount) > 0.01) {
        return setError(
          `Split amounts must sum to ${parsedAmount.toFixed(2)} (currently ${total.toFixed(2)})`,
        )
      }
      splits = Object.entries(unequalAmounts)
        .filter(([, v]) => parseFloat(v) > 0)
        .map(([participant_id, v]) => ({
          participant_id,
          amount: parseFloat(v),
        }))
    }

    setSaving(true)
    try {
      await createExpense({
        trip_id: tripId,
        description: description.trim(),
        amount: parsedAmount,
        currency,
        paid_by: paidBy,
        split_type:
          splitType === 'unequal' || splits.length > 0 ? 'unequal' : 'even',
        splits,
      })
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense')
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <h3 className="mb-4">Add expense</h3>

      <label className="block text-sm font-medium mb-1 text-[var(--color-ink-soft)]">
        What was it?
      </label>
      <input
        className="input mb-4"
        placeholder="Dinner at Trattoria da Enzo"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1 text-[var(--color-ink-soft)]">
            Amount
          </label>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="w-28">
          <label className="block text-sm font-medium mb-1 text-[var(--color-ink-soft)]">
            Currency
          </label>
          <select
            className="input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <label className="block text-sm font-medium mb-1 text-[var(--color-ink-soft)]">
        Paid by
      </label>
      <select
        className="input mb-4"
        value={paidBy}
        onChange={(e) => setPaidBy(e.target.value)}
      >
        {participants.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <label className="block text-sm font-medium mb-2 text-[var(--color-ink-soft)]">
        Split
      </label>
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          className={
            splitType === 'even'
              ? 'btn-primary flex-1 !py-2 !text-sm'
              : 'btn-secondary flex-1 !py-2 !text-sm'
          }
          onClick={() => setSplitType('even')}
        >
          Equally
        </button>
        <button
          type="button"
          className={
            splitType === 'unequal'
              ? 'btn-primary flex-1 !py-2 !text-sm'
              : 'btn-secondary flex-1 !py-2 !text-sm'
          }
          onClick={() => setSplitType('unequal')}
        >
          Custom amounts
        </button>
      </div>

      {splitType === 'even' && (
        <div className="mb-4 space-y-1">
          <p className="text-xs text-[var(--color-ink-muted)] mb-2">
            Uncheck anyone who shouldn't be included.
          </p>
          {participants.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm py-1">
              <input
                type="checkbox"
                checked={participantsIncluded.has(p.id)}
                onChange={() => toggleIncluded(p.id)}
                className="accent-[var(--color-accent)]"
              />
              {p.name}
            </label>
          ))}
        </div>
      )}

      {splitType === 'unequal' && (
        <div className="mb-4 space-y-2">
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="text-sm w-32">{p.name}</span>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                value={unequalAmounts[p.id] ?? ''}
                onChange={(e) =>
                  setUnequalAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-700 mb-3">{error}</p>}

      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button
          className="btn-primary flex-1"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Adding…' : 'Add expense'}
        </button>
      </div>
    </div>
  )
}
