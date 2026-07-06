import { useState } from 'react'
import { Sheet } from '../components/Sheet'
import { joinTripByCode } from '../lib/api'

type Props = {
  open: boolean
  onClose: () => void
  onBack: () => void
  onJoined: (tripId: string) => void
}

export function JoinTripSheet({ open, onClose, onBack, onJoined }: Props) {
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = code.trim().length >= 4 && !submitting

  async function submit() {
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      const { trip_id } = await joinTripByCode(code)
      onJoined(trip_id)
      setCode('')
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message.replace(/^error:\s*/i, '')
          : 'Invalid or expired code',
      )
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} onBack={onBack} title="Join a trip">
      <p className="text-[14.5px] text-[var(--color-fg-2)] mb-4">
        Enter the invite code a friend shared with you.
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Invite code"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        className="w-full box-border bg-white border border-[var(--color-border)] rounded-xl px-4 py-4 text-[18px] font-semibold text-[var(--color-fg-1)] tracking-[0.12em] uppercase"
      />
      {error && (
        <p className="text-[13px] text-[var(--color-danger)] font-medium mt-3">
          {error}
        </p>
      )}
      <button
        onClick={submit}
        disabled={!canSubmit}
        className={
          'no-ring mt-4 w-full py-4 rounded-full border-none font-semibold text-[16px] tracking-tight ' +
          (canSubmit
            ? 'bg-[var(--color-core-purple)] text-white cursor-pointer'
            : 'bg-[var(--color-grey-200)] text-[var(--color-fg-3)] cursor-not-allowed')
        }
      >
        {submitting ? 'Joining…' : 'Join trip'}
      </button>
    </Sheet>
  )
}
