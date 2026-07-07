/**
 * Parse a user-entered amount string into a number, handling both US and
 * European conventions:
 *
 *   "139.96"   -> 139.96     (US: dot decimal)
 *   "139,96"   -> 139.96     (EU/LATAM: comma decimal)
 *   "1,234.56" -> 1234.56    (US: comma thousand, dot decimal)
 *   "1.234,56" -> 1234.56    (EU: dot thousand, comma decimal)
 *   "1000"     -> 1000       (no separator)
 *
 * Rule of thumb: whichever separator appears LAST is the decimal separator;
 * any occurrences of the other character are stripped as thousand separators.
 */
export function parseAmount(input: string | number): number {
  if (typeof input === 'number') return isFinite(input) ? input : 0

  const trimmed = String(input ?? '').trim()
  if (!trimmed) return 0

  const lastComma = trimmed.lastIndexOf(',')
  const lastDot = trimmed.lastIndexOf('.')

  let normalized: string
  if (lastComma > lastDot) {
    // Comma is the decimal separator; dots (if any) are thousand separators.
    normalized = trimmed.replace(/\./g, '').replace(',', '.')
  } else {
    // Dot is the decimal separator (or no decimal at all); strip any commas.
    normalized = trimmed.replace(/,/g, '')
  }

  const n = parseFloat(normalized)
  return isNaN(n) ? 0 : n
}
