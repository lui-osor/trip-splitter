import { useCallback, useEffect, useState } from 'react'
import { listExpenses } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Expense } from '../lib/database.types'

/**
 * Loads expenses for a trip and subscribes to realtime changes.
 * Members come from `useTrips` (already fetched with each trip); this hook
 * only handles the per-trip expense feed and its live updates.
 */
export function useTripData(tripId: string | null | undefined) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!tripId) return
    try {
      const rows = await listExpenses(tripId)
      setExpenses(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses')
    }
  }, [tripId])

  useEffect(() => {
    if (!tripId) {
      setExpenses([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    listExpenses(tripId)
      .then((rows) => {
        if (!cancelled) {
          setExpenses(rows)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load expenses')
          setLoading(false)
        }
      })

    const channel = supabase
      .channel(`trip-expenses-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          listExpenses(tripId).then((rows) => {
            if (!cancelled) setExpenses(rows)
          })
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [tripId])

  return { expenses, loading, error, refresh }
}
