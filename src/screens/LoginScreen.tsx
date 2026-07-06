import { useState } from 'react'
import { signInWithPassword, signUpWithPassword } from '../hooks/useAuth'
import { IS_DEV } from '../lib/supabase'

type Mode = 'signin' | 'signup'

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSignup = mode === 'signup'
  const emailOk = email.trim().length > 2 && email.includes('@')
  const passwordOk = password.length >= 6
  const nameOk = !isSignup || name.trim().length > 0
  const canSubmit = emailOk && passwordOk && nameOk && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      if (isSignup) {
        await signUpWithPassword(email, password, name)
      } else {
        await signInWithPassword(email, password)
      }
      // useAuth will pick up the new session via onAuthStateChange.
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Try again.',
      )
      setSubmitting(false)
    }
  }

  function toggleMode() {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
    setError(null)
    setPassword('')
  }

  return (
    <div className="absolute inset-0 z-[60] bg-[var(--color-sand)] flex flex-col px-8 pt-14 pb-8">
      <div className="flex-1 flex flex-col justify-center">
        {/* Logo mark */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-[var(--color-core-purple)] text-white font-semibold text-[26px] flex items-center justify-center leading-none">
            ts
          </div>
          {IS_DEV && (
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-[var(--color-purple-100)] text-[var(--color-core-purple)]">
              Dev
            </span>
          )}
        </div>

        <h1 className="mb-2">
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-[var(--color-fg-2)] text-[14.5px]">
          {isSignup
            ? 'Split trip expenses without the awkwardness.'
            : 'Sign in to your trips.'}
        </p>

        <div className="mt-7 flex flex-col gap-3">
          {isSignup && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoComplete="name"
              className="w-full box-border bg-white border border-[var(--color-border)] rounded-xl px-4 py-4 text-[16px] text-[var(--color-fg-1)]"
            />
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            autoComplete="email"
            placeholder="Email"
            className="w-full box-border bg-white border border-[var(--color-border)] rounded-xl px-4 py-4 text-[16px] text-[var(--color-fg-1)]"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            placeholder={isSignup ? 'Password (min 6 chars)' : 'Password'}
            className="w-full box-border bg-white border border-[var(--color-border)] rounded-xl px-4 py-4 text-[16px] text-[var(--color-fg-1)]"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && (
          <p className="text-[13.5px] text-[var(--color-danger)] font-medium mt-3">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={
            'no-ring mt-5 w-full py-4 rounded-full text-[16px] font-semibold tracking-tight ' +
            (canSubmit
              ? 'bg-[var(--color-core-purple)] text-white cursor-pointer'
              : 'bg-[var(--color-grey-200)] text-[var(--color-fg-3)] cursor-not-allowed')
          }
        >
          {submitting
            ? isSignup
              ? 'Creating account…'
              : 'Signing in…'
            : isSignup
              ? 'Create account'
              : 'Sign in'}
        </button>
      </div>

      <div className="text-center text-[13.5px] text-[var(--color-fg-2)]">
        {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          type="button"
          onClick={toggleMode}
          className="no-ring bg-transparent border-none p-0 text-[var(--color-core-purple)] font-semibold cursor-pointer"
        >
          {isSignup ? 'Sign in' : 'Sign up'}
        </button>
      </div>
    </div>
  )
}
