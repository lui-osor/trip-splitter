// Live currency conversion via open.er-api.com (free, no auth, includes COP).
// Rates map currency code -> value in base currency.
//
// For COP specifically, open.er-api's rate typically matches Colombia's
// official TRM (Superfinanciera) within ~0.3%. If we need exact TRM,
// we can layer in datos.gov.co's `?resource_id=32sa-8pi3` endpoint later.

const CACHE_KEY = 'ts_currency_rates_v2' // v2: bumped when we swapped providers
const CACHE_TTL_MS = 12 * 60 * 60 * 1000

type CachedRates = {
  base: string
  rates: Record<string, number>
  fetched_at: number
}

export const SUPPORTED_CURRENCIES = [
  'EUR', 'USD', 'GBP', 'COP', 'CHF',
  'SEK', 'NOK', 'DKK', 'CZK', 'PLN',
  'HUF', 'JPY', 'CAD',
] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]

/**
 * Fetches rates with `base` as the reference currency.
 * Returns a map where `rates[X]` is: 1 unit of X = rates[X] units of base.
 * (This flips Frankfurter's output, which is "1 base = X target".)
 */
export async function fetchRates(base: string): Promise<Record<string, number>> {
  const cached = readCache()
  if (cached && cached.base === base && Date.now() - cached.fetched_at < CACHE_TTL_MS) {
    return cached.rates
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`)
    if (!res.ok) throw new Error(`rates HTTP ${res.status}`)
    const data = (await res.json()) as {
      result: string
      base_code: string
      rates: Record<string, number>
    }
    if (data.result !== 'success' || !data.rates) {
      throw new Error(`rates API returned no data`)
    }

    // API returns "1 base = X target". We want "1 target = X base" (so
    // `convert(amount, from, to, rates)` can just multiply).
    const inverted: Record<string, number> = { [base]: 1 }
    for (const [code, rate] of Object.entries(data.rates)) {
      if (rate > 0) inverted[code] = 1 / rate
    }
    writeCache({ base, rates: inverted, fetched_at: Date.now() })
    return inverted
  } catch (err) {
    console.warn('Currency fetch failed, falling back', err)
    if (cached?.base === base) return cached.rates
    return Object.fromEntries(SUPPORTED_CURRENCIES.map((c) => [c, 1]))
  }
}

/** Convert `amount` in `from` currency to `to` currency. */
export function convert(
  amount: number,
  from: string,
  to: string,
  ratesInTo: Record<string, number>,
): number {
  if (from === to) return amount
  const rate = ratesInTo[from]
  if (!rate) return amount // fallback: pretend 1:1 if unknown
  return amount * rate
}

function readCache(): CachedRates | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as CachedRates) : null
  } catch {
    return null
  }
}

function writeCache(data: CachedRates): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    /* ignore quota / disabled storage */
  }
}

const CURRENCY_DECIMALS: Record<string, number> = {
  COP: 0,
  JPY: 0,
  HUF: 0,
}

export function decimalsFor(currency: string): number {
  return CURRENCY_DECIMALS[currency] ?? 2
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  // Explicit COP prefix so `$` isn't ambiguous with USD.
  COP: 'COP $',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  JPY: '¥',
  CAD: '$',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
}

export function formatMoney(amount: number, currency: string): string {
  const dec = decimalsFor(currency)
  const sym = CURRENCY_SYMBOLS[currency] ?? ''
  const abs = Math.abs(amount)
  const num = abs.toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
  const sign = amount < 0 ? '-' : ''
  return sym ? `${sign}${sym} ${num}` : `${sign}${num} ${currency}`
}
