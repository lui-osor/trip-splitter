import { useEffect, useState } from 'react'
import { getTrip, listExpenses } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Expense, Trip } from '../lib/database.types'

/**
 * Loads a trip and its expenses, subscribes to realtime updates.
 * Returns { trip, expenses, loading, error, refresh }.
 */
export function useTrip(tripId: string | undefined) {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tripId) return
    let cancelled = false

    async function load() {
      try {
        const [t, ex] = await Promise.all([getTrip(tripId!), listExpenses(tripId!)])
        if (cancelled) return
        if (!t) {
          setError('Trip not found')
        } else {
          setTrip(t)
          setExpenses(ex)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    const channel = supabase
      .channel(`trip-${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` },
        () => {
          listExpenses(tripId).then((ex) => {
            if (!cancelled) setExpenses(ex)
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        (payload) => {
          if (!cancelled) setTrip(payload.new as Trip)
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [tripId])

  async function refresh() {
    if (!tripId) return
    const ex = await listExpenses(tripId)
    setExpenses(ex)
  }

  return { trip, expenses, loading, error, refresh }
}
