import { useCallback, useEffect, useState } from 'react'
import { listMyTrips } from '../lib/api'
import type { TripWithMembers } from '../lib/api'

const CURRENT_TRIP_KEY = 'ts_current_trip_id_v1'

export type UseTripsState = {
  trips: TripWithMembers[]
  currentTrip: TripWithMembers | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  setCurrent: (tripId: string) => void
}

/**
 * Loads the current user's trips and tracks the "active" one.
 * Active-trip id is persisted to localStorage so refreshes stay put.
 * Must be used inside a signed-in view (relies on the auth session).
 */
export function useTrips(userId: string | undefined): UseTripsState {
  const [trips, setTrips] = useState<TripWithMembers[]>([])
  const [currentId, setCurrentId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CURRENT_TRIP_KEY)
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const fresh = await listMyTrips()
      setTrips(fresh)
      // If current trip no longer exists (deleted / lost membership), reset.
      if (currentId && !fresh.find((t) => t.id === currentId)) {
        setCurrentId(fresh[0]?.id ?? null)
      } else if (!currentId && fresh.length > 0) {
        setCurrentId(fresh[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trips')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId])

  useEffect(() => {
    if (!userId) {
      setTrips([])
      setCurrentId(null)
      setLoading(false)
      return
    }
    setLoading(true)
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    try {
      if (currentId) localStorage.setItem(CURRENT_TRIP_KEY, currentId)
      else localStorage.removeItem(CURRENT_TRIP_KEY)
    } catch {
      // ignore
    }
  }, [currentId])

  const currentTrip =
    (currentId && trips.find((t) => t.id === currentId)) || trips[0] || null

  return {
    trips,
    currentTrip,
    loading,
    error,
    refresh,
    setCurrent: setCurrentId,
  }
}
