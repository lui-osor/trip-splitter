/**
 * Extracts a human-readable message from any thrown value.
 * Handles native Errors, Supabase PostgrestError (has .message + .details),
 * and unknown values with a `message` property.
 */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (!err) return fallback

  if (typeof err === 'string') return err

  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>
    const msg = typeof e.message === 'string' ? e.message : ''
    const details = typeof e.details === 'string' ? e.details : ''
    const hint = typeof e.hint === 'string' ? e.hint : ''
    const combined = [msg, details, hint].filter(Boolean).join(' — ')
    if (combined) return combined
  }

  return fallback
}
