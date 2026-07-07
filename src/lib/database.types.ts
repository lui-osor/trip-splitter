// Types match the Supabase schema after migrations 001..006.

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'stay'
  | 'fun'
  | 'shopping'
  | 'other'
  | 'settlement'

export type SplitType = 'even' | 'unequal'

export type SplitEntry = {
  participant_id: string
  amount: number
}

export type Profile = {
  id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export type Trip = {
  id: string
  name: string
  base_currency: string
  code: string // 5-char invite code (upper-case)
  owner_id: string | null
  created_at: string
  // Legacy JSONB column, kept until we drop it in a later migration.
  participants: unknown[]
}

export type TripMember = {
  id: string
  trip_id: string
  user_id: string | null // null = placeholder (not yet claimed)
  name: string
  color: string
  joined_at: string
}

export type Expense = {
  id: string
  trip_id: string
  description: string
  amount: number
  currency: string
  paid_by: string // trip_members.id
  split_type: SplitType
  splits: SplitEntry[]
  category: ExpenseCategory
  expense_date: string | null // YYYY-MM-DD
  created_at: string
}

// Supabase v2 client requires this exact shape on the Database generic.
// The extra keys (Views/Enums/CompositeTypes + Relationships[]) unlock proper
// type inference on `.from(...)` and `.rpc(...)` calls; without them the row
// types collapse to `never` at build time.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
        Relationships: []
      }
      trips: {
        Row: Trip
        Insert: Omit<Trip, 'id' | 'code' | 'created_at' | 'participants'> & {
          id?: string
          code?: string
          created_at?: string
          participants?: unknown[]
        }
        Update: Partial<Omit<Trip, 'id' | 'created_at'>>
        Relationships: []
      }
      trip_members: {
        Row: TripMember
        Insert: Omit<TripMember, 'id' | 'joined_at'> & {
          id?: string
          joined_at?: string
        }
        Update: Partial<Omit<TripMember, 'id' | 'joined_at'>>
        Relationships: []
      }
      expenses: {
        Row: Expense
        Insert: Omit<Expense, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Expense, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      join_trip_by_code: {
        Args: { join_code: string }
        Returns: { trip_id: string; trip_name: string }[]
      }
      create_trip: {
        Args: {
          trip_name: string
          trip_base_currency?: string
          provided_code?: string | null
        }
        Returns: {
          id: string
          name: string
          base_currency: string
          code: string
          owner_id: string
          created_at: string
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
