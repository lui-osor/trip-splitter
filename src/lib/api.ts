import { supabase } from './supabase'
import type { Expense, Participant, Trip } from './database.types'

// ---------- Trips ----------

export async function createTrip(input: {
  name: string
  base_currency: string
  participants: Participant[]
}): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .insert({
      name: input.name,
      base_currency: input.base_currency,
      participants: input.participants,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getTrip(id: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select()
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateTripParticipants(
  id: string,
  participants: Participant[],
): Promise<void> {
  const { error } = await supabase
    .from('trips')
    .update({ participants })
    .eq('id', id)
  if (error) throw error
}

// ---------- Expenses ----------

export async function listExpenses(tripId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select()
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createExpense(
  input: Omit<Expense, 'id' | 'created_at'>,
): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}
