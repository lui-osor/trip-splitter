import { Avatar } from '../../components/Avatar'
import { formatMoney } from '../../lib/currency'
import type { Settlement } from '../../lib/balances'

type Props = {
  settlements: Settlement[]
  simplify: boolean
  onToggleSimplify: () => void
  displayCurrency: string
  currentMemberId: string | null
  onPay?: (s: Settlement) => void
}

export function SettleTab({
  settlements,
  simplify,
  onToggleSimplify,
  displayCurrency,
  currentMemberId,
}: Props) {
  const allSettled = settlements.length === 0

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-[15px] font-semibold tracking-tight">
            How to settle up
          </div>
          <div className="text-[12.5px] text-[var(--color-fg-2)] mt-0.5">
            {simplify
              ? 'Minimum transactions.'
              : 'Every debt as-is.'}
          </div>
        </div>
        <button
          onClick={onToggleSimplify}
          className="no-ring inline-flex items-center gap-2 bg-[var(--color-purple-100)] border-none rounded-full px-4 py-2.5 cursor-pointer text-[12.5px] font-semibold text-[var(--color-core-purple)]"
        >
          {simplify ? 'Simplified' : 'Detailed'}
        </button>
      </div>

      {allSettled ? (
        <div className="text-center py-14 rounded-[20px] bg-[var(--color-success-soft)]">
          <span className="w-14 h-14 rounded-full bg-[var(--color-success)] inline-flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l4 4L19 6" />
            </svg>
          </span>
          <div className="text-[18px] font-semibold tracking-tight mt-3.5 text-[var(--color-green-700)]">
            All settled up
          </div>
          <div className="text-[13.5px] text-[var(--color-fg-2)] mt-1">
            Nobody owes anybody.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {settlements.map((s, i) => {
            const involvesYou =
              s.fromId === currentMemberId || s.toId === currentMemberId
            const title =
              s.fromId === currentMemberId
                ? `You pay ${s.toName}`
                : s.toId === currentMemberId
                  ? `${s.fromName} pays you`
                  : `${s.fromName} pays ${s.toName}`
            return (
              <div
                key={i}
                className="flex items-center gap-3 py-3.5 px-4 bg-white border border-[var(--color-border)] rounded-2xl"
                style={{ boxShadow: '0 1px 2px rgba(30,0,47,0.06)' }}
              >
                <Avatar name={s.fromName} color={s.fromColor} size={38} />
                <span className="flex-1 min-w-0">
                  <span
                    className="block text-[14.5px] font-semibold tracking-tight leading-tight"
                    style={{
                      color: involvesYou
                        ? 'var(--color-fg-1)'
                        : 'var(--color-fg-1)',
                    }}
                  >
                    {title}
                  </span>
                  <span className="block text-[16px] font-semibold text-[var(--color-core-purple)] mt-1 tabular-nums">
                    {formatMoney(s.amount, displayCurrency)}
                  </span>
                </span>
                <Avatar name={s.toName} color={s.toColor} size={38} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
