import { useState } from 'react'
import { Sheet } from '../components/Sheet'
import { CopyableCode } from '../components/CopyableCode'
import { createTrip, generateTripCode } from '../lib/api'
import { errorMessage } from '../lib/errors'

const CURRENCY_OPTIONS = ['COP', 'USD', 'EUR', 'GBP', 'CHF']

type Props = {
  open: boolean
  onClose: () => void
  onBack: () => void
  onCreated: (tripId: string) => void
}

export function CreateTripSheet({ open, onClose, onBack, onCreated }: Props) {
  const [name, setName] = useState('')
  const [baseCurrency, setBaseCurrency] = useState('EUR')
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = name.trim().length > 0 && !submitting

  function handleGenerateCode() {
    setInviteCode(generateTripCode())
  }

  async function submit() {
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      const trip = await createTrip({
        name,
        baseCurrency,
        providedCode: inviteCode,
      })
      onCreated(trip.id)
      // reset for next time
      setName('')
      setBaseCurrency('EUR')
      setInviteCode(null)
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
      <div className="flex gap-2 mb-6 flex-wrap">
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
        Invite friends
      </div>

      {inviteCode ? (
        <>
          <CopyableCode code={inviteCode} variant="prominent" />
          <p className="text-[13px] text-[var(--color-fg-2)] leading-snug mt-2.5">
            Copy and share this code with your friends so they can join.
            They'll need to sign up (or sign in) with their own account.
          </p>
          <button
            onClick={handleGenerateCode}
            className="no-ring bg-transparent border-none p-0 mt-2.5 cursor-pointer text-[12.5px] font-medium text-[var(--color-fg-3)]"
          >
            Generate a different code
          </button>
        </>
      ) : (
        <button
          onClick={handleGenerateCode}
          className="no-ring inline-flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-[var(--color-core-purple)] text-[14px] font-semibold py-1"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add person
        </button>
      )}

      {error && (
        <p className="text-[13.5px] text-[var(--color-danger)] font-medium mt-4">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={!canSubmit}
        className={
          'no-ring w-full mt-6 py-4 rounded-full border-none font-semibold text-[16px] tracking-tight ' +
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
