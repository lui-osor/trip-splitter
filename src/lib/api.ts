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
 * Calls the SECURITY DEFINER RPC `create_trip` so the whole flow (trip + owner
 * membership + placeholder friends) runs atomically without RLS/RETURNING races.
 * `friendNames` are placeholder members (user_id = null, joinable later).
 */
export async function createTripWithMembers(input: {
  name: string
  baseCurrency: string
  friendNames: string[]
}): Promise<TripWithMembers> {
  const cleanedFriends = input.friendNames
    .map((n) => n.trim())
    .filter((n) => n.length > 0)

  const { data, error } = await supabase.rpc('create_trip', {
    trip_name: input.name,
    trip_base_currency: input.baseCurrency,
    friend_names: cleanedFriends,
  })
  if (error) throw error

  const created = Array.isArray(data) ? data[0] : data
  if (!created) throw new Error('Trip was not created')

  // Fetch the newly-created trip's members so the UI has a complete object.
  const { data: members, error: mErr } = await supabase
    .from('trip_members')
    .select()
    .eq('trip_id', created.id)
  if (mErr) throw mErr

  return {
    id: created.id,
    name: created.name,
    base_currency: created.base_currency,
    code: created.code,
    owner_id: created.owner_id,
    created_at: created.created_at,
    participants: [],
    members: members ?? [],
  }
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
