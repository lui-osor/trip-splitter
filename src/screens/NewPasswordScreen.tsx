import { useState } from 'react'
import { signOut, updatePassword } from '../hooks/useAuth'
import { errorMessage } from '../lib/errors'
import { IS_DEV } from '../lib/supabase'

type Props = {
  email: string
  onDone: () => void
}

/**
 * Shown when the auth state is PASSWORD_RECOVERY — i.e. the user arrived
 * from a reset-password email link. Forces them to set a new password
 * before they can continue.
 */
export function NewPasswordScreen({ email, onDone }: Props) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordOk = password.length >= 6
  const matches = password === confirmPassword
  const canSubmit = passwordOk && matches && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      await updatePassword(password)
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Failed to update password'))
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    // Cancelling in recovery flow: sign out so we're back at login.
    try {
      await signOut()
    } catch {
      /* ignore */
    }
    onDone()
  }

  return (
    <div className="absolute inset-0 z-[60] bg-[var(--color-sand)] flex flex-col px-8 pt-14 pb-8">
      <div className="flex-1 flex flex-col justify-center">
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

        <h1 className="mb-2">Set a new password</h1>
        <p className="text-[var(--color-fg-2)] text-[14.5px]">
          Choose a new password for{' '}
          <span className="font-semibold">{email || 'your account'}</span>.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="New password (min 6 chars)"
            className="w-full box-border bg-white border border-[var(--color-border)] rounded-xl px-4 py-4 text-[16px] text-[var(--color-fg-1)]"
          />
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="Confirm password"
            className={
              'w-full box-border bg-white border rounded-xl px-4 py-4 text-[16px] text-[var(--color-fg-1)] ' +
              (confirmPassword.length > 0 && !matches
                ? 'border-[var(--color-danger)]'
                : 'border-[var(--color-border)]')
            }
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          {confirmPassword.length > 0 && !matches && (
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
          {submitting ? 'Saving…' : 'Update password'}
        </button>
      </div>

      <button
        onClick={handleCancel}
        className="no-ring bg-transparent border-none text-center text-[13.5px] text-[var(--color-fg-2)] cursor-pointer"
      >
        Cancel and sign in with another account
      </button>
    </div>
  )
}
