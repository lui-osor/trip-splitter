// Fetches live currency conversion rates from Frankfurter (free ECB-backed API, no key needed).
// Rates map currency code -> value in base currency. e.g. { GBP: 1.16, USD: 0.92 } for EUR base.

const CACHE_KEY = 'ts_currency_rates_v1'
const CACHE_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

type CachedRates = {
  base: string
  rates: Record<string, number>
  fetched_at: number
}

export const SUPPORTED_CURRENCIES = [
  'EUR', 'GBP', 'USD', 'CHF', 'SEK', 'NOK', 'DKK',
  'CZK', 'PLN', 'HUF', 'RON', 'BGN', 'JPY', 'CAD',
] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]

export async function fetchRates(base: string): Promise<Record<string, number>> {
  const cached = readCache()
  if (cached && cached.base === base && Date.now() - cached.fetched_at < CACHE_TTL_MS) {
    return cached.rates
  }

  try {
    const res = await fetch(`https://api.frankfurter.app/latest?base=${base}`)
    if (!res.ok) throw new Error(`Rates fetch failed: ${res.status}`)
    const data = (await res.json()) as { base: string; rates: Record<string, number> }

    // Frankfurter returns "1 base = X target". We want "1 target = X base",
    // so we invert.
    const inverted: Record<string, number> = {}
    for (const [code, rate] of Object.entries(data.rates)) {
      inverted[code] = 1 / rate
    }
    inverted[base] = 1

    writeCache({ base, rates: inverted, fetched_at: Date.now() })
    return inverted
  } catch (err) {
    console.warn('Currency fetch failed, falling back to cached or 1:1', err)
    if (cached?.base === base) return cached.rates
    // Last-resort: all 1:1
    return Object.fromEntries(SUPPORTED_CURRENCIES.map((c) => [c, 1]))
  }
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
    // localStorage may be unavailable; ignore.
  }
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
