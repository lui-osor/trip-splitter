import { formatMoney } from '../lib/currency'
import type { Balance, Settlement } from '../lib/settle'

type Props = {
  balances: Balance[]
  settlements: Settlement[]
  baseCurrency: string
}

export function BalancesView({ balances, settlements, baseCurrency }: Props) {
  const allZero = balances.every((b) => Math.abs(b.amount) < 0.01)

  return (
    <div className="card">
      <h3 className="mb-1">Balances</h3>
      <p className="text-sm text-[var(--color-ink-muted)] mb-4">
        In {baseCurrency}, using live exchange rates.
      </p>

      {allZero ? (
        <p className="text-sm text-[var(--color-ink-soft)] py-2">
          🎉 All settled up — everyone's even.
        </p>
      ) : (
        <>
          <div className="space-y-1 mb-6">
            {balances.map((b) => (
              <div
                key={b.participant_id}
                className="flex justify-between items-baseline py-1.5 border-b border-[var(--color-border-soft)] last:border-b-0"
              >
                <span className="font-medium">{b.name}</span>
                <span
                  className={
                    'tabular-nums text-sm ' +
                    (b.amount > 0.005
                      ? 'text-[var(--color-success)]'
                      : b.amount < -0.005
                        ? 'text-[var(--color-accent)]'
                        : 'text-[var(--color-ink-muted)]')
                  }
                >
                  {b.amount > 0.005 && 'gets back '}
                  {b.amount < -0.005 && 'owes '}
                  {formatMoney(Math.abs(b.amount), baseCurrency)}
                </span>
              </div>
            ))}
          </div>

          {settlements.length > 0 && (
            <>
              <h3 className="text-base mb-2">Settle up</h3>
              <p className="text-xs text-[var(--color-ink-muted)] mb-3">
                {settlements.length} payment{settlements.length !== 1 ? 's' : ''}{' '}
                to settle everyone.
              </p>
              <div className="space-y-2">
                {settlements.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm bg-[var(--color-cream-soft)] rounded-md px-3 py-2"
                  >
                    <span>
                      <span className="font-medium">{s.from_name}</span>{' '}
                      <span className="text-[var(--color-ink-muted)]">→</span>{' '}
                      <span className="font-medium">{s.to_name}</span>
                    </span>
                    <span className="tabular-nums font-medium">
                      {formatMoney(s.amount, baseCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
