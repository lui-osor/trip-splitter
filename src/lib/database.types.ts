export type Participant = {
  id: string
  name: string
}

export type SplitEntry = {
  participant_id: string
  amount: number
}

export type Trip = {
  id: string
  name: string
  base_currency: string
  participants: Participant[]
  created_at: string
}

export type Expense = {
  id: string
  trip_id: string
  description: string
  amount: number
  currency: string
  paid_by: string
  split_type: 'even' | 'unequal'
  splits: SplitEntry[]
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      trips: {
        Row: Trip
        Insert: Omit<Trip, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Trip, 'id' | 'created_at'>>
      }
      expenses: {
        Row: Expense
        Insert: Omit<Expense, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Expense, 'id' | 'created_at'>>
      }
    }
  }
}
