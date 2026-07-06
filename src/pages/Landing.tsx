import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTrip } from '../lib/api'

export function Landing() {
  const navigate = useNavigate()
  const [tripName, setTripName] = useState('')
  const [joinId, setJoinId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!tripName.trim()) return
    setLoading(true)
    setError(null)
    try {
      const trip = await createTrip({
        name: tripName.trim(),
        base_currency: 'EUR',
        participants: [],
      })
      navigate(`/trip/${trip.id}/setup`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip')
      setLoading(false)
    }
  }

  function handleJoin() {
    const id = joinId.trim()
    if (!id) return
    // Accept full URL or plain ID
    const match = id.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
    const tripId = match ? match[1] : id
    navigate(`/trip/${tripId}`)
  }

  return (
    <div className="flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center">
        <h1 className="mb-4">
          Split expenses<br />
          <span className="italic text-[var(--color-accent)]">without the awkwardness.</span>
        </h1>
        <p className="text-[var(--color-ink-soft)] text-lg mb-10 leading-relaxed">
          A simple, shared ledger for your trip. Track who paid, who owes,
          and settle up in one tap when you get home.
        </p>

        <div className="card text-left mb-4">
          <label className="block text-sm font-medium mb-2 text-[var(--color-ink-soft)]">
            Start a new trip
          </label>
          <input
            className="input mb-4"
            placeholder="Europe 2026 ✨"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            className="btn-primary w-full"
            disabled={!tripName.trim() || loading}
            onClick={handleCreate}
          >
            {loading ? 'Creating…' : 'Create trip →'}
          </button>
          {error && (
            <p className="text-sm text-red-700 mt-3">{error}</p>
          )}
        </div>

        <div className="card text-left">
          <label className="block text-sm font-medium mb-2 text-[var(--color-ink-soft)]">
            Or join an existing trip
          </label>
          <input
            className="input mb-4"
            placeholder="Paste trip link or ID"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <button
            className="btn-secondary w-full"
            disabled={!joinId.trim()}
            onClick={handleJoin}
          >
            Join trip
          </button>
        </div>

        <p className="text-xs text-[var(--color-ink-muted)] mt-6">
          No account needed. Share the trip link with your travel buddies.
        </p>
      </div>
    </div>
  )
}
