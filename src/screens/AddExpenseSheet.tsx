import { useMemo, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { CategoryIcon } from '../components/CategoryIcon'
import { Avatar } from '../components/Avatar'
import { createExpense } from '../lib/api'
import { CATEGORIES } from '../lib/categories'
import { SUPPORTED_CURRENCIES, decimalsFor } from '../lib/currency'
import { errorMessage } from '../lib/errors'
import type {
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
  onClose: () => void
  onAdded: () => void
}

export function AddExpenseSheet({
  open,
  tripId,
  baseCurrency,
  members,
  currentUserId,
  onClose,
  onAdded,
}: Props) {
  const [desc, setDesc] = useState('')
  const [amountRaw, setAmountRaw] = useState('')
  const [currency, setCurrency] = useState(baseCurrency)
  const [category, setCategory] = useState<ExpenseCategory>('food')
  const [paidBy, setPaidBy] = useState<string>(() => {
    // Default to the current user (their member row) if present.
    return (
      members.find((m) => m.user_id === currentUserId)?.id ??
      members[0]?.id ??
      ''
    )
  })
  const [splitType, setSplitType] = useState<SplitType>('even')
  const [included, setIncluded] = useState<Set<string>>(
    () => new Set(members.map((m) => m.id)),
  )
  const [shares, setShares] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amount = parseFloat(amountRaw.replace(/,/g, '')) || 0

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
      (sum, [, v]) => sum + (parseFloat(v) || 0),
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
            amount: parseFloat(v) || 0,
          }))
          .filter((s) => s.amount > 0)
      }

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
      onAdded()
      reset()
    } catch (err) {
      setError(errorMessage(err, 'Failed to add expense'))
      setSubmitting(false)
    }
  }

  function reset() {
    setDesc('')
    setAmountRaw('')
    setCurrency(baseCurrency)
    setCategory('food')
    setSplitType('even')
    setIncluded(new Set(members.map((m) => m.id)))
    setShares({})
    setSubmitting(false)
    setError(null)
  }

  const dec = decimalsFor(currency)

  return (
    <Sheet open={open} onClose={onClose} title="New expense">
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
        {submitting ? 'Adding…' : 'Add expense'}
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
