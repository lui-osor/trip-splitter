import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/database.types'

export type AuthState = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  /**
   * True after Supabase fires `PASSWORD_RECOVERY` — i.e. the user arrived
   * here from a password-reset email link. In this state we should force
   * them to set a new password before doing anything else.
   */
  isPasswordRecovery: boolean
  refreshProfile: () => Promise<void>
  clearPasswordRecovery: () => void
}

/**
 * Subscribes to Supabase session + loads the caller's profile row.
 * The `handle_new_user` trigger creates the profile automatically on signup,
 * so we just fetch it here.
 */
export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const uid = session?.user?.id
  useEffect(() => {
    if (!uid) {
      setProfile(null)
      return
    }
    let cancelled = false
    supabase
      .from('profiles')
      .select()
      .eq('id', uid)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProfile(data)
      })
    return () => {
      cancelled = true
    }
  }, [uid])

  async function refreshProfile() {
    if (!uid) return
    const { data } = await supabase
      .from('profiles')
      .select()
      .eq('id', uid)
      .maybeSingle()
    setProfile(data)
  }

  function clearPasswordRecovery() {
    setIsPasswordRecovery(false)
  }

  return {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isPasswordRecovery,
    refreshProfile,
    clearPasswordRecovery,
  }
}

// ---------- action helpers (called from LoginScreen) ----------

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error) throw error
  return data
}

export async function signUpWithPassword(
  email: string,
  password: string,
  name: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      // Picked up by the handle_new_user trigger to seed profiles.name.
      data: { name: name.trim() },
    },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Send a password-reset link to the given email. Supabase composes the email
 * and includes a one-time link that lands back on this app; when the user
 * arrives, `onAuthStateChange` fires with `PASSWORD_RECOVERY`, unlocking
 * the "set new password" flow.
 */
export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: window.location.origin + window.location.pathname },
  )
  if (error) throw error
}

/** Set a new password. Only valid while in PASSWORD_RECOVERY state. */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
