import { Avatar } from '../../components/Avatar'
import { formatMoney } from '../../lib/currency'
import type { NetBalance } from '../../lib/balances'

type Props = {
  balances: NetBalance[]
  currentMemberId: string | null
  displayCurrency: string
}

export function BalancesTab({
  balances,
  currentMemberId,
  displayCurrency,
}: Props) {
  const you = balances.find((b) => b.memberId === currentMemberId)
  const others = balances.filter((b) => b.memberId !== currentMemberId)

  const youAmount = you?.amount ?? 0
  const youIsCredit = youAmount > 0.005
  const youIsDebt = youAmount < -0.005

  const youBg = youIsCredit
    ? 'var(--color-success-soft)'
    : youIsDebt
      ? 'var(--color-danger-soft)'
      : 'var(--color-grey-100)'
  const youColor = youIsCredit
    ? 'var(--color-success)'
    : youIsDebt
      ? 'var(--color-danger)'
      : 'var(--color-fg-2)'
  const youCaption = youIsCredit
    ? "You're owed"
    : youIsDebt
      ? 'You owe'
      : "You're all settled"
  const youHint = youIsCredit
    ? 'Others will pay you back.'
    : youIsDebt
      ? 'Head to Settle to see who to pay.'
      : 'No open balances on this trip.'

  return (
    <div>
      {/* Your net card */}
      <div
        className="rounded-[20px] p-5 text-center mb-6"
        style={{ background: youBg }}
      >
        <div className="text-[13px] font-medium text-[var(--color-fg-2)]">
          {youCaption}
        </div>
        <div
          className="text-[38px] font-semibold tracking-tight mt-1.5"
          style={{ color: youColor }}
        >
          {formatMoney(Math.abs(youAmount), displayCurrency)}
        </div>
        <div className="text-[13px] text-[var(--color-fg-3)] mt-1.5">
          {youHint}
        </div>
      </div>

      <div className="text-[15px] font-semibold tracking-tight mb-3">
        Everyone's balance
      </div>
      <div className="flex flex-col">
        {others.length === 0 && (
          <p className="text-[13.5px] text-[var(--color-fg-3)] py-4">
            No other members yet.
          </p>
        )}
        {others.map((b) => {
          const credit = b.amount > 0.005
          const debt = b.amount < -0.005
          const status = credit
            ? 'gets back'
            : debt
              ? 'owes'
              : 'settled'
          const color = credit
            ? 'var(--color-success)'
            : debt
              ? 'var(--color-danger)'
              : 'var(--color-fg-2)'
          return (
            <div
              key={b.memberId}
              className="flex items-center gap-3 py-3 border-b border-[var(--color-divider)] last:border-b-0"
            >
              <Avatar name={b.name} color={b.color} size={40} />
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold tracking-tight truncate">
                  {b.name}
                </span>
                <span className="block text-[12.5px] text-[var(--color-fg-2)] mt-0.5">
                  {status}
                </span>
              </span>
              <span
                className="text-[15px] font-semibold tracking-tight tabular-nums"
                style={{ color }}
              >
                {credit || debt
                  ? formatMoney(Math.abs(b.amount), displayCurrency)
                  : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
