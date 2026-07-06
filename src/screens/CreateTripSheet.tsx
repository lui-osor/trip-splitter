import { useState } from 'react'
import { Sheet } from '../components/Sheet'
import { createTripWithMembers } from '../lib/api'
import { errorMessage } from '../lib/errors'

const CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP', 'COP', 'CHF']

type Props = {
  open: boolean
  onClose: () => void
  onBack: () => void
  onCreated: (tripId: string) => void
}

export function CreateTripSheet({ open, onClose, onBack, onCreated }: Props) {
  const [name, setName] = useState('')
  const [baseCurrency, setBaseCurrency] = useState('EUR')
  const [friends, setFriends] = useState<string[]>(['', ''])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = name.trim().length > 0 && !submitting

  function updateFriend(i: number, value: string) {
    setFriends((prev) => prev.map((n, idx) => (idx === i ? value : n)))
  }

  function removeFriend(i: number) {
    setFriends((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))
  }

  function addFriend() {
    setFriends((prev) => [...prev, ''])
  }

  async function submit() {
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      const trip = await createTripWithMembers({
        name,
        baseCurrency,
        friendNames: friends,
      })
      onCreated(trip.id)
      // reset for next time
      setName('')
      setBaseCurrency('EUR')
      setFriends(['', ''])
    } catch (err) {
      setError(errorMessage(err, 'Failed to create trip'))
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} onBack={onBack} title="New trip">
      <div className="text-[13px] font-semibold text-[var(--color-fg-2)] mb-2">
        Trip name
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Eurotrip 2026"
        className="w-full box-border bg-white border border-[var(--color-border)] rounded-xl px-4 py-3.5 text-[16px] text-[var(--color-fg-1)] mb-5"
      />

      <div className="text-[13px] font-semibold text-[var(--color-fg-2)] mb-2">
        Base currency
      </div>
      <div className="flex gap-2 mb-5 flex-wrap">
        {CURRENCY_OPTIONS.map((c) => {
          const selected = baseCurrency === c
          return (
            <button
              key={c}
              onClick={() => setBaseCurrency(c)}
              className={
                'no-ring flex-1 min-w-[64px] py-3 rounded-xl border-[1.5px] font-semibold text-[14px] cursor-pointer ' +
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

      <div className="text-[13px] font-semibold text-[var(--color-fg-2)] mb-2">
        Add friends (placeholders — they can sign up later with the code)
      </div>
      <div className="flex flex-col gap-2 mb-2">
        {friends.map((n, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={n}
              onChange={(e) => updateFriend(i, e.target.value)}
              placeholder="Friend's name"
              className="flex-1 min-w-0 box-border bg-white border border-[var(--color-border)] rounded-xl px-4 py-3 text-[15px] text-[var(--color-fg-1)]"
            />
            {friends.length > 1 && (
              <button
                onClick={() => removeFriend(i)}
                aria-label="Remove"
                className="no-ring w-[38px] h-[38px] rounded-full bg-[var(--color-grey-100)] border-none cursor-pointer flex items-center justify-center flex-shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(30,0,47,0.55)" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M5 12h14" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={addFriend}
        className="no-ring inline-flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-[var(--color-core-purple)] text-[14px] font-semibold py-1 mb-4"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add person
      </button>

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
        {submitting ? 'Creating…' : 'Create trip'}
      </button>
    </Sheet>
  )
}
