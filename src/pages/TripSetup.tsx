import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTrip } from '../lib/api'
import { SUPPORTED_CURRENCIES } from '../lib/currency'
import { supabase } from '../lib/supabase'
import type { Trip } from '../lib/database.types'

export function TripSetup() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [names, setNames] = useState<string[]>(['', ''])
  const [currency, setCurrency] = useState<string>('EUR')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tripId) return
    getTrip(tripId).then((t) => {
      if (!t) {
        setError('Trip not found')
      } else {
        setTrip(t)
        setCurrency(t.base_currency)
        if (t.participants.length > 0) {
          // Trip is already set up; redirect to view
          navigate(`/trip/${tripId}`, { replace: true })
        }
      }
      setLoading(false)
    })
  }, [tripId, navigate])

  function updateName(idx: number, value: string) {
    setNames((prev) => prev.map((n, i) => (i === idx ? value : n)))
  }

  function addPerson() {
    setNames((prev) => [...prev, ''])
  }

  function removePerson(idx: number) {
    setNames((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev))
  }

  async function handleSave() {
    if (!tripId || !trip) return
    const cleaned = names.map((n) => n.trim()).filter((n) => n.length > 0)
    if (cleaned.length < 2) {
      setError('Add at least two people')
      return
    }
    setSaving(true)
    setError(null)
    const participants = cleaned.map((name) => ({
      id: crypto.randomUUID(),
      name,
    }))
    try {
      // Update currency + participants in one call
      const { error: err } = await supabase
        .from('trips')
        .update({ participants, base_currency: currency })
        .eq('id', tripId)
      if (err) throw err
      navigate(`/trip/${tripId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-16 text-[var(--color-ink-muted)]">Loading…</div>
  if (error && !trip) return <div className="text-center py-16 text-red-700">{error}</div>
  if (!trip) return null

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <p className="text-sm text-[var(--color-ink-muted)] mb-2">Setting up</p>
      <h1 className="mb-2">{trip.name}</h1>
      <p className="text-[var(--color-ink-soft)] mb-8">
        Who's on this trip? Add everyone who'll be sharing expenses.
      </p>

      <div className="card">
        <label className="block text-sm font-medium mb-2 text-[var(--color-ink-soft)]">
          Base currency
        </label>
        <select
          className="input mb-6"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label className="block text-sm font-medium mb-2 text-[var(--color-ink-soft)]">
          People
        </label>
        <div className="space-y-2 mb-4">
          {names.map((name, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                className="input"
                placeholder={`Person ${idx + 1}`}
                value={name}
                onChange={(e) => updateName(idx, e.target.value)}
              />
              {names.length > 2 && (
                <button
                  className="btn-secondary px-3"
                  onClick={() => removePerson(idx)}
                  type="button"
                  aria-label="Remove person"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="text-sm text-[var(--color-accent)] hover:underline mb-6"
          onClick={addPerson}
        >
          + Add another person
        </button>

        {error && <p className="text-sm text-red-700 mb-3">{error}</p>}

        <button
          className="btn-primary w-full"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Start tracking expenses →'}
        </button>
      </div>
    </div>
  )
}
