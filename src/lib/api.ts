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
 * 5-char invite code alphabet. Excludes easily-confused chars (0/O, 1/I, etc.).
 * Space size 32^5 ≈ 33M — collision-resistant at any reasonable scale.
 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateTripCode(): string {
  let out = ''
  for (let i = 0; i < 5; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return out
}

/**
 * Create a new trip. Only the creator becomes an initial member; everyone
 * else joins via the invite code (real accounts, no placeholder rows).
 * If `providedCode` is set, we hand it to the RPC — this lets the user see
 * and share the code before submitting. On the unlikely unique-code collision,
 * the RPC will error; we retry once with a freshly-generated code.
 */
export async function createTrip(input: {
  name: string
  baseCurrency: string
  providedCode?: string | null
}): Promise<TripWithMembers> {
  async function attempt(code: string | null) {
    return supabase.rpc('create_trip', {
      trip_name: input.name,
      trip_base_currency: input.baseCurrency,
      provided_code: code,
    })
  }

  let { data, error } = await attempt(input.providedCode ?? null)
  // Retry once on unique_violation with a fresh code.
  if (error && /duplicate|unique/i.test(error.message)) {
    ;({ data, error } = await attempt(generateTripCode()))
  }
  if (error) throw error

  const created = Array.isArray(data) ? data[0] : data
  if (!created) throw new Error('Trip was not created')

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
 * Remove a member from a trip. RLS enforces that only the trip owner can
 * remove others (and members can remove themselves via `leaveTrip`).
 * The caller is responsible for the balance check — we don't want to duplicate
 * that logic in the DB when the client already has it computed.
 */
export async function removeTripMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_members')
    .delete()
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
