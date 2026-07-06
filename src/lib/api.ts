import { supabase } from './supabase'
import type { Expense, ExpenseCategory, SplitEntry, SplitType, Trip, TripMember } from './database.types'

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

// ---------- Expenses ----------

export async function listExpenses(tripId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select()
    .eq('trip_id', tripId)
    .order('expense_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createExpense(input: {
  tripId: string
  description: string
  amount: number
  currency: string
  paidBy: string
  category: ExpenseCategory
  splitType: SplitType
  splits: SplitEntry[]
  expenseDate?: string | null
}): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      trip_id: input.tripId,
      description: input.description.trim(),
      amount: input.amount,
      currency: input.currency,
      paid_by: input.paidBy,
      category: input.category,
      split_type: input.splitType,
      splits: input.splits,
      expense_date: input.expenseDate ?? new Date().toISOString().slice(0, 10),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

// ---------- Profile / member management ----------

export async function updateProfileName(name: string): Promise<void> {
  const trimmed = name.trim()
  if (trimmed.length === 0) throw new Error('Name is required')

  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) throw new Error('Not signed in')

  const { error } = await supabase
    .from('profiles')
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', uid)
  if (error) throw error
}

export async function renameTripMember(
  memberId: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim()
  if (trimmed.length === 0) throw new Error('Name is required')

  const { error } = await supabase
    .from('trip_members')
    .update({ name: trimmed })
    .eq('id', memberId)
  if (error) throw error
}

/**
 * Remove the current user from the trip. Trip owner cannot leave — must delete.
 * The DB policy allows both self-removal and owner-removal, so this covers self.
 */
export async function leaveTrip(tripId: string): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) throw new Error('Not signed in')

  const { error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', uid)
  if (error) throw error
}

/**
 * Delete the trip entirely (owner only). Cascades to members + expenses.
 */
export async function deleteTrip(tripId: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', tripId)
  if (error) throw error
}
