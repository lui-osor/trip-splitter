import { useMemo, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { CategoryIcon } from '../components/CategoryIcon'
import { Avatar } from '../components/Avatar'
import { createExpense, updateExpense } from '../lib/api'
import { CATEGORIES } from '../lib/categories'
import { SUPPORTED_CURRENCIES, decimalsFor } from '../lib/currency'
import { errorMessage } from '../lib/errors'
import { parseAmount } from '../lib/parseAmount'
import type {
  Expense,
  ExpenseCategory,
  SplitEntry,
  SplitType,
  TripMember,
} from '../lib/database.types'

const PROMOTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'COP', 'CHF']

type Props = {
  open: boolean
  tripId: string
  baseCurrency: string
  members: TripMember[]
  currentUserId: string
  /** If provided, the sheet opens in edit mode and pre-fills from this expense. */
  expense?: Expense | null
  onClose: () => void
  onSaved: () => void
}

export function AddExpenseSheet({
  open,
  tripId,
  baseCurrency,
  members,
  currentUserId,
  expense,
  onClose,
  onSaved,
}: Props) {
  const editing = Boolean(expense)

  const [desc, setDesc] = useState(expense?.description ?? '')
  const [amountRaw, setAmountRaw] = useState(
    expense ? String(expense.amount) : '',
  )
  const [currency, setCurrency] = useState(expense?.currency ?? baseCurrency)
  const [category, setCategory] = useState<ExpenseCategory>(
    expense?.category ?? 'food',
  )
  const [paidBy, setPaidBy] = useState<string>(() => {
    // Editing: keep the original payer if they're still a member.
    if (expense) {
      const stillMember = members.find((m) => m.id === expense.paid_by)
      if (stillMember) return stillMember.id
    }
    // Otherwise default to the current user.
    return (
      members.find((m) => m.user_id === currentUserId)?.id ??
      members[0]?.id ??
      ''
    )
  })
  const [splitType, setSplitType] = useState<SplitType>(
    expense?.split_type ?? 'even',
  )

  // "Included" only matters for even splits. Behaviour:
  //   - editing an old even expense with empty splits[] (means "all members
  //     at that time") -> use ALL current members, which naturally lets you
  //     add new joiners to the retro split.
  //   - editing an even expense with a specific subset -> use those, dropping
  //     any IDs that no longer exist (removed members).
  //   - creating fresh -> everyone included by default.
  const [included, setIncluded] = useState<Set<string>>(() => {
    if (expense && expense.split_type === 'even' && expense.splits.length > 0) {
      const currentIds = new Set(members.map((m) => m.id))
      return new Set(
        expense.splits
          .map((s) => s.participant_id)
          .filter((id) => currentIds.has(id)),
      )
    }
    return new Set(members.map((m) => m.id))
  })

  const [shares, setShares] = useState<Record<string, string>>(() => {
    if (expense && expense.splits.length > 0) {
      const currentIds = new Set(members.map((m) => m.id))
      const out: Record<string, string> = {}
      for (const s of expense.splits) {
        if (currentIds.has(s.participant_id)) {
          out[s.participant_id] = String(s.amount)
        }
      }
      return out
    }
    return {}
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amount = parseAmount(amountRaw)

  const currencyOptions = useMemo(() => {
    const seen = new Set([...PROMOTED_CURRENCIES, baseCurrency])
    return [
      baseCurrency,
      ...PROMOTED_CURRENCIES.filter((c) => c !== baseCurrency),
      ...SUPPORTED_CURRENCIES.filter((c) => !seen.has(c)),
    ]
  }, [baseCurrency])

  const currentIncludedTotal = useMemo(() => {
    if (splitType === 'even') return null
    return Object.entries(shares).reduce(
      (sum, [, v]) => sum + parseAmount(v),
      0,
    )
  }, [shares, splitType])

  const splitOk =
    splitType === 'even'
      ? included.size > 0
      : currentIncludedTotal !== null &&
        Math.abs(currentIncludedTotal - amount) < 0.005

  const canSubmit =
    desc.trim().length > 0 &&
    amount > 0 &&
    paidBy.length > 0 &&
    splitOk &&
    !submitting

  function toggleIncluded(id: string) {
    setIncluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function submit() {
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      let splits: SplitEntry[]
      let finalSplitType: SplitType = splitType

      if (splitType === 'even') {
        const includedMembers = members.filter((m) => included.has(m.id))
        if (includedMembers.length === members.length) {
          // All members included -> keep the schema empty splits[], the balance
          // engine falls back to "all members" when splits[] is empty.
          splits = []
        } else {
          // Subset -> unequal with equal shares among the subset (server-side truth).
          finalSplitType = 'unequal'
          const share = amount / includedMembers.length
          splits = includedMembers.map((m) => ({
            participant_id: m.id,
            amount: round(share),
          }))
        }
      } else {
        splits = Object.entries(shares)
          .map(([participant_id, v]) => ({
            participant_id,
            amount: parseAmount(v),
          }))
          .filter((s) => s.amount > 0)
      }

      if (expense) {
        await updateExpense(expense.id, {
          description: desc,
          amount,
          currency,
          paidBy,
          category,
          splitType: finalSplitType,
          splits,
        })
      } else {
        await createExpense({
          tripId,
          description: desc,
          amount,
          currency,
          paidBy,
          category,
          splitType: finalSplitType,
          splits,
        })
      }
      onSaved()
      // No manual reset needed — Sheet unmounts on close and state re-inits.
    } catch (err) {
      setError(
        errorMessage(err, editing ? 'Failed to save changes' : 'Failed to add expense'),
      )
      setSubmitting(false)
    }
  }

  const dec = decimalsFor(currency)

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Edit expense' : 'New expense'}>
      {/* Description */}
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="e.g. Dinner in Lisbon"
        className="w-full box-border bg-white border border-[var(--color-border)] rounded-xl px-4 py-3.5 text-[16px] text-[var(--color-fg-1)] mb-3.5"
      />

      {/* Amount */}
      <input
        value={amountRaw}
        onChange={(e) => setAmountRaw(e.target.value)}
        inputMode="decimal"
        placeholder={dec === 0 ? '0' : '0.00'}
        className="w-full box-border bg-white border border-[var(--color-border)] rounded-xl px-4 py-3.5 text-[20px] font-semibold text-[var(--color-fg-1)] mb-3"
      />

      {/* Currency chips (promoted list) */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto app-scroll -mx-1 px-1">
        {currencyOptions.slice(0, 5).map((c) => {
          const selected = currency === c
          return (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={
                'no-ring flex-1 min-w-[54px] py-2.5 rounded-xl border-[1.5px] text-[13.5px] font-semibold cursor-pointer ' +
                (selected
                  ? 'border-[var(--color-core-purple)] bg-[var(--color-purple-100)] text-[var(--color-core-purple)]'
                  : 'border-[var(--color-border)] bg-white text-[var(--color-fg-2)]')
              }
            >
              {c}
            </button>
          )
        })}
      </div>

      {/* Category chips */}
      <div className="text-[13px] font-semibold text-[var(--color-fg-2)] mb-2">
        Category
      </div>
      <div className="flex gap-2 flex-wrap mb-5">
        {CATEGORIES.filter((c) => c.key !== 'settlement').map((c) => {
          const selected = category === c.key
          return (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={
                'no-ring inline-flex items-center gap-1.5 py-2 px-3 rounded-full border-[1.5px] text-[13px] font-medium cursor-pointer ' +
                (selected
                  ? 'text-[var(--color-uv-purple)]'
                  : 'text-[var(--color-fg-2)] bg-white')
              }
              style={
                selected
                  ? { borderColor: c.color, background: c.bg }
                  : { borderColor: 'var(--color-border)' }
              }
            >
              <CategoryIcon category={c.key} size={14} color={selected ? c.color : 'var(--color-fg-2)' as string} />
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Paid by */}
      <div className="text-[13px] font-semibold text-[var(--color-fg-2)] mb-2">
        Paid by
      </div>
      <div className="flex gap-2 mb-5 overflow-x-auto app-scroll -mx-1 px-1">
        {members.map((m) => {
          const selected = paidBy === m.id
          return (
            <button
              key={m.id}
              onClick={() => setPaidBy(m.id)}
              className={
                'no-ring min-w-[70px] flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-2xl border-[1.5px] cursor-pointer flex-1 ' +
                (selected
                  ? 'border-[var(--color-core-purple)] bg-[var(--color-purple-100)]'
                  : 'border-[var(--color-border)] bg-white')
              }
            >
              <Avatar name={m.name} color={m.color} size={32} />
              <span
                className="text-[11.5px] font-semibold truncate max-w-full"
                style={{
                  color: selected
                    ? 'var(--color-core-purple)'
                    : 'var(--color-fg-2)',
                }}
              >
                {m.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Split type */}
      <div className="text-[13px] font-semibold text-[var(--color-fg-2)] mb-2">
        Split
      </div>
      <div className="flex gap-1 bg-[var(--color-grey-100)] rounded-2xl p-1 mb-3.5">
        {(['even', 'unequal'] as SplitType[]).map((t) => {
          const selected = splitType === t
          return (
            <button
              key={t}
              onClick={() => setSplitType(t)}
              className="no-ring flex-1 py-2.5 rounded-xl border-none cursor-pointer font-semibold text-[13px]"
              style={{
                background: selected ? 'white' : 'transparent',
                color: selected ? 'var(--color-fg-1)' : 'var(--color-fg-2)',
                boxShadow: selected
                  ? '0 1px 2px rgba(30,0,47,0.08)'
                  : 'none',
              }}
            >
              {t === 'even' ? 'Equally' : 'Custom amounts'}
            </button>
          )
        })}
      </div>

      {/* Participants */}
      <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden mb-3">
        {members.map((m, idx) => {
          const isIncluded = splitType === 'even' ? included.has(m.id) : true
          return (
            <div
              key={m.id}
              className={
                'flex items-center gap-3 py-3 px-3.5 ' +
                (idx < members.length - 1
                  ? 'border-b border-[var(--color-divider)]'
                  : '')
              }
              style={{ opacity: isIncluded ? 1 : 0.5 }}
            >
              {splitType === 'even' && (
                <button
                  onClick={() => toggleIncluded(m.id)}
                  className="no-ring bg-transparent border-none p-0 cursor-pointer flex-shrink-0"
                >
                  <Checkbox checked={included.has(m.id)} />
                </button>
              )}
              <Avatar name={m.name} color={m.color} size={32} />
              <span className="flex-1 text-[14.5px] font-medium truncate">
                {m.name}
              </span>
              {splitType === 'unequal' ? (
                <input
                  value={shares[m.id] ?? ''}
                  onChange={(e) =>
                    setShares((prev) => ({ ...prev, [m.id]: e.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="0"
                  className="w-20 text-right border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-[14px] font-semibold"
                />
              ) : (
                <span className="text-[13.5px] font-semibold text-[var(--color-fg-2)]">
                  {included.has(m.id) && included.size > 0
                    ? formatAmount(amount / included.size, dec)
                    : '—'}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Status line */}
      <div className="flex items-center justify-between text-[13px] mb-4 px-1">
        <span className="text-[var(--color-fg-2)] font-medium">
          {splitType === 'even'
            ? `${included.size} of ${members.length} included`
            : 'Sum of shares'}
        </span>
        <span
          className="font-semibold"
          style={{
            color: splitOk ? 'var(--color-success)' : 'var(--color-danger)',
          }}
        >
          {splitType === 'even'
            ? included.size > 0
              ? formatAmount(amount / (included.size || 1), dec) + ' each'
              : '—'
            : `${formatAmount(currentIncludedTotal ?? 0, dec)} / ${formatAmount(amount, dec)}`}
        </span>
      </div>

      {error && (
        <p className="text-[13.5px] text-[var(--color-danger)] font-medium mb-3">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={!canSubmit}
        className={
          'no-ring w-full py-4 rounded-full border-none font-semibold text-[16px] tracking-tight ' +
          (canSubmit
            ? 'bg-[var(--color-core-purple)] text-white cursor-pointer'
            : 'bg-[var(--color-grey-200)] text-[var(--color-fg-3)] cursor-not-allowed')
        }
      >
        {submitting
          ? editing
            ? 'Saving…'
            : 'Adding…'
          : editing
            ? 'Save changes'
            : 'Add expense'}
      </button>
    </Sheet>
  )
  void category // keep the category state used
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className="w-[20px] h-[20px] rounded-md flex items-center justify-center flex-shrink-0"
      style={{
        border: checked
          ? '2px solid var(--color-core-purple)'
          : '1.5px solid var(--color-border-strong)',
        background: checked ? 'var(--color-core-purple)' : 'white',
      }}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l4 4L19 6" />
        </svg>
      )}
    </span>
  )
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
function formatAmount(n: number, dec: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}
