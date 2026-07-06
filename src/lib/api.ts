import { supabase } from './supabase'
import type { Trip, TripMember } from './database.types'

/** A trip enriched with its members list (fetched together for convenience). */
export type TripWithMembers = Trip & {
  members: TripMember[]
}

// ---------- Trips ----------

/**
 * Lists all trips the current user belongs to, with members preloaded.
 * Ordered by most recently created first.
 */
export async function listMyTrips(): Promise<TripWithMembers[]> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return []

  // Get trip IDs where the user is a member.
  const { data: memberships, error: mErr } = await supabase
    .from('trip_members')
    .select('trip_id')
    .eq('user_id', user.user.id)
  if (mErr) throw mErr

  const tripIds = (memberships ?? []).map((m) => m.trip_id)
  if (tripIds.length === 0) return []

  // Fetch trips + all their members in parallel.
  const [tripsRes, membersRes] = await Promise.all([
    supabase
      .from('trips')
      .select()
      .in('id', tripIds)
      .order('created_at', { ascending: false }),
    supabase.from('trip_members').select().in('trip_id', tripIds),
  ])

  if (tripsRes.error) throw tripsRes.error
  if (membersRes.error) throw membersRes.error

  const membersByTrip = new Map<string, TripMember[]>()
  for (const m of membersRes.data ?? []) {
    const list = membersByTrip.get(m.trip_id) ?? []
    list.push(m)
    membersByTrip.set(m.trip_id, list)
  }

  return (tripsRes.data ?? []).map((t) => ({
    ...t,
    members: membersByTrip.get(t.id) ?? [],
  }))
}

/**
 * Create a new trip and add the current user as owner + first member.
 * `friendNames` are placeholder members (user_id = null, joinable later).
 */
export async function createTripWithMembers(input: {
  name: string
  baseCurrency: string
  friendNames: string[]
}): Promise<TripWithMembers> {
  const { data: userRes } = await supabase.auth.getUser()
  const user = userRes.user
  if (!user) throw new Error('Not signed in')

  const { data: profile } = await supabase
    .from('profiles')
    .select()
    .eq('id', user.id)
    .maybeSingle()

  const trip = await supabase
    .from('trips')
    .insert({
      name: input.name.trim(),
      base_currency: input.baseCurrency,
      owner_id: user.id,
    })
    .select()
    .single()
  if (trip.error) throw trip.error

  const AVATAR_COLORS = [
    '#DA9AC7', '#8DCDE2', '#A7D296', '#E9A6A7',
    '#EEEDB3', '#E5D8BD', '#85D1BD', '#96B0FD',
  ]

  const rows = [
    // Owner as the first member
    {
      trip_id: trip.data.id,
      user_id: user.id,
      name: profile?.name || user.email?.split('@')[0] || 'You',
      color: profile?.color || '#CBA5FD',
    },
    // Placeholder friends
    ...input.friendNames
      .map((n) => n.trim())
      .filter((n) => n.length > 0)
      .map((name, idx) => ({
        trip_id: trip.data.id,
        user_id: null,
        name,
        color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      })),
  ]

  const membersRes = await supabase.from('trip_members').insert(rows).select()
  if (membersRes.error) throw membersRes.error

  return { ...trip.data, members: membersRes.data ?? [] }
}

/**
 * Join a trip by 5-char invite code. Returns the trip id + name.
 * Handled by the SECURITY DEFINER function `join_trip_by_code`.
 */
export async function joinTripByCode(
  code: string,
): Promise<{ trip_id: string; trip_name: string }> {
  const { data, error } = await supabase.rpc('join_trip_by_code', {
    join_code: code.trim().toUpperCase(),
  })
  if (error) throw error
  const first = Array.isArray(data) ? data[0] : data
  if (!first) throw new Error('Invalid invite code')
  return first as { trip_id: string; trip_name: string }
}
