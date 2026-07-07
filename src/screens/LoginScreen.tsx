import { useState } from 'react'
import {
  sendPasswordResetEmail,
  signInWithPassword,
  signUpWithPassword,
} from '../hooks/useAuth'
import { Logo } from '../components/Logo'
import { errorMessage } from '../lib/errors'
import { IS_DEV } from '../lib/supabase'

type Mode = 'signin' | 'signup' | 'forgot'

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)

  const isSignup = mode === 'signup'
  const isForgot = mode === 'forgot'

  const emailOk = email.trim().length > 2 && email.includes('@')
  const passwordOk = password.length >= 6
  const nameOk = !isSignup || name.trim().length > 0
  const passwordsMatch = !isSignup || password === confirmPassword

  const canSubmit = (() => {
    if (submitting) return false
    if (isForgot) return emailOk
    if (isSignup)
      return emailOk && passwordOk && nameOk && passwordsMatch
    return emailOk && password.length > 0
  })()

  async function handleSubmit() {
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      if (isForgot) {
        await sendPasswordResetEmail(email)
        setResetSent(true)
      } else if (isSignup) {
        if (!passwordsMatch) throw new Error("Passwords don't match")
        await signUpWithPassword(email, password, name)
      } else {
        await signInWithPassword(email, password)
      }
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong. Try again.'))
      setSubmitting(false)
      return
    }
    if (!isForgot) setSubmitting(false)
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setPassword('')
    setConfirmPassword('')
    setResetSent(false)
  }

  const heading = isForgot
    ? 'Reset your password'
    : isSignup
      ? 'Create your account'
      : 'Welcome back'
  const sub = isForgot
    ? "We'll email you a link to set a new password."
    : isSignup
      ? 'Split trip expenses without the awkwardness.'
      : 'Sign in to your trips.'
  const primaryLabel = submitting
    ? isForgot
      ? 'Sending…'
      : isSignup
        ? 'Creating account…'
        : 'Signing in…'
    : isForgot
      ? 'Send reset link'
      : isSignup
        ? 'Create account'
        : 'Sign in'

  return (
    <div className="absolute inset-0 z-[60] bg-[var(--color-sand)] flex flex-col px-8 pt-14 pb-8">
      <div className="flex-1 flex flex-col justify-center">
        {/* Logo mark */}
        <div className="flex items-center gap-2 mb-8">
          <Logo size={56} />
          {IS_DEV && (
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-[var(--color-purple-100)] text-[var(--color-core-purple)]">
              Dev
            </span>
          )}
        </div>

        <h1 className="mb-2">{heading}</h1>
        <p className="text-[var(--color-fg-2)] text-[14.5px]">{sub}</p>

        {/* Post-send confirmation for forgot mode */}
        {isForgot && resetSent ? (
          <div className="mt-7">
            <div className="rounded-2xl bg-[var(--color-success-soft)] p-4 text-[14px] text-[var(--color-fg-1)] leading-snug">
              We've sent a reset link to <span className="font-semibold">{email}</span>.
              Check your inbox (and spam) and click the link to set a new password.
            </div>
            <button
              onClick={() => switchMode('signin')}
              className="no-ring mt-5 w-full py-4 rounded-full border-none bg-[var(--color-core-purple)] text-white font-semibold text-[16px] cursor-pointer tracking-tight"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
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
                onKeyDown={(e) =>
                  isForgot && e.key === 'Enter' && handleSubmit()
                }
              />
              {!isForgot && (
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  placeholder={isSignup ? 'Password (min 6 chars)' : 'Password'}
                  className="w-full box-border bg-white border border-[var(--color-border)] rounded-xl px-4 py-4 text-[16px] text-[var(--color-fg-1)]"
                  onKeyDown={(e) =>
                    !isSignup && e.key === 'Enter' && handleSubmit()
                  }
                />
              )}
              {isSignup && (
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm password"
                  className={
                    'w-full box-border bg-white border rounded-xl px-4 py-4 text-[16px] text-[var(--color-fg-1)] ' +
                    (confirmPassword.length > 0 && !passwordsMatch
                      ? 'border-[var(--color-danger)]'
                      : 'border-[var(--color-border)]')
                  }
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              )}
              {isSignup && confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-[13px] text-[var(--color-danger)] font-medium">
                  Passwords don't match.
                </p>
              )}
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
              {primaryLabel}
            </button>

            {/* Forgot-password link, only in signin */}
            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="no-ring bg-transparent border-none p-0 mt-4 self-center text-[13.5px] font-medium text-[var(--color-core-purple)] cursor-pointer"
              >
                Forgot your password?
              </button>
            )}
          </>
        )}
      </div>

      {/* Bottom mode toggle */}
      <div className="text-center text-[13.5px] text-[var(--color-fg-2)]">
        {isForgot ? (
          <>
            Remembered it?{' '}
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="no-ring bg-transparent border-none p-0 text-[var(--color-core-purple)] font-semibold cursor-pointer"
            >
              Sign in
            </button>
          </>
        ) : isSignup ? (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="no-ring bg-transparent border-none p-0 text-[var(--color-core-purple)] font-semibold cursor-pointer"
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className="no-ring bg-transparent border-none p-0 text-[var(--color-core-purple)] font-semibold cursor-pointer"
            >
              Sign up
            </button>
          </>
        )}
      </div>
    </div>
  )
}
