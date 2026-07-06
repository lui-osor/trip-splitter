export type TabKey = 'feed' | 'balances' | 'settle' | 'summary'

type Props = {
  tab: TabKey
  onTab: (t: TabKey) => void
  onAdd: () => void
}

export function BottomNav({ tab, onTab, onAdd }: Props) {
  return (
    <div className="absolute left-0 right-0 bottom-0 h-[82px] bg-white/95 backdrop-blur-md border-t border-[var(--color-border)] flex items-start px-3 pt-2.5 z-20">
      <NavButton label="Expenses" active={tab === 'feed'} onClick={() => onTab('feed')}>
        <FeedIcon active={tab === 'feed'} />
      </NavButton>
      <NavButton label="Balances" active={tab === 'balances'} onClick={() => onTab('balances')}>
        <BalancesIcon active={tab === 'balances'} />
      </NavButton>

      <div className="w-16 flex-shrink-0 flex justify-center">
        <button
          onClick={onAdd}
          className="no-ring w-[58px] h-[58px] rounded-full bg-[var(--color-core-purple)] border-none cursor-pointer flex items-center justify-center -mt-5"
          style={{ boxShadow: '0 8px 20px rgba(141,13,227,0.36)' }}
          aria-label="Add expense"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <NavButton label="Settle" active={tab === 'settle'} onClick={() => onTab('settle')}>
        <SettleIcon active={tab === 'settle'} />
      </NavButton>
      <NavButton label="Summary" active={tab === 'summary'} onClick={() => onTab('summary')}>
        <SummaryIcon active={tab === 'summary'} />
      </NavButton>
    </div>
  )
}

function NavButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const color = active ? 'var(--color-core-purple)' : 'var(--color-grey-500)'
  return (
    <button
      onClick={onClick}
      className="no-ring flex-1 bg-transparent border-none cursor-pointer flex flex-col items-center gap-1 pt-1.5"
      style={{ color }}
    >
      {children}
      <span className="text-[10.5px] font-semibold tracking-tight">{label}</span>
    </button>
  )
}

function baseSvg(children: React.ReactNode, active: boolean, color = 'currentColor') {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2.2 : 2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}
function FeedIcon({ active }: { active: boolean }) {
  return baseSvg(
    <>
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-2.5-1.5L13 20l-2.5-1.5L8 20l-2.5-1.5L5 20V5a1 1 0 0 1 1-1z" />
      <path d="M8.5 9h7" />
      <path d="M8.5 13h5" />
    </>,
    active,
  )
}
function BalancesIcon({ active }: { active: boolean }) {
  return baseSvg(
    <>
      <path d="M5 20V10" />
      <path d="M12 20V4" />
      <path d="M19 20v-7" />
    </>,
    active,
  )
}
function SettleIcon({ active }: { active: boolean }) {
  return baseSvg(
    <>
      <path d="M4 8h13l-3-3" />
      <path d="M20 16H7l3 3" />
    </>,
    active,
  )
}
function SummaryIcon({ active }: { active: boolean }) {
  return baseSvg(
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 12V4a8 8 0 0 1 7 4z" />
    </>,
    active,
  )
}
