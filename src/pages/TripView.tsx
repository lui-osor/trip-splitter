import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { AddExpenseForm } from '../components/AddExpenseForm'
import { BalancesView } from '../components/BalancesView'
import { ExpenseList } from '../components/ExpenseList'
import { fetchRates } from '../lib/currency'
import { useTrip } from '../hooks/useTrip'
import { computeBalances, computeSettlements } from '../lib/settle'

export function TripView() {
  const { tripId } = useParams<{ tripId: string }>()
  const { trip, expenses, loading, error, refresh } = useTrip(tripId)
  const [showAdd, setShowAdd] = useState(false)
  const [rates, setRates] = useState<Record<string, number>>({})
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!trip) return
    fetchRates(trip.base_currency).then(setRates)
  }, [trip])

  const { balances, settlements } = useMemo(() => {
    if (!trip) return { balances: [], settlements: [] }
    const bal = computeBalances(trip.participants, expenses, trip.base_currency, rates)
    return { balances: bal, settlements: computeSettlements(bal) }
  }, [trip, expenses, rates])

  function copyShareLink() {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return <div className="text-center py-16 text-[var(--color-ink-muted)]">Loading…</div>
  }
  if (error) {
    return <div className="text-center py-16 text-red-700">{error}</div>
  }
  if (!trip) return null

  // If trip has no participants, send to setup
  if (trip.participants.length === 0) {
    return <Navigate to={`/trip/${trip.id}/setup`} replace />
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-sm text-[var(--color-ink-muted)] mb-1">Trip</p>
          <h1 className="mb-1">{trip.name}</h1>
          <p className="text-sm text-[var(--color-ink-soft)]">
            {trip.participants.map((p) => p.name).join(', ')}
          </p>
        </div>
        <button
          className="btn-secondary !py-2 !px-3 !text-sm shrink-0"
          onClick={copyShareLink}
        >
          {copied ? '✓ Copied' : 'Share link'}
        </button>
      </div>

      <div className="mb-6">
        <BalancesView
          balances={balances}
          settlements={settlements}
          baseCurrency={trip.base_currency}
        />
      </div>

      <div className="mb-6">
        {showAdd ? (
          <AddExpenseForm
            tripId={trip.id}
            participants={trip.participants}
            baseCurrency={trip.base_currency}
            onAdded={() => {
              setShowAdd(false)
              refresh()
            }}
            onCancel={() => setShowAdd(false)}
          />
        ) : (
          <button
            className="btn-primary w-full"
            onClick={() => setShowAdd(true)}
          >
            + Add expense
          </button>
        )}
      </div>

      <div>
        <h3 className="mb-3">Expenses</h3>
        <ExpenseList
          expenses={expenses}
          participants={trip.participants}
          onDeleted={refresh}
        />
      </div>
    </div>
  )
}
