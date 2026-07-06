import { Sheet } from '../components/Sheet'
import { CopyableCode } from '../components/CopyableCode'
import type { TripWithMembers } from '../lib/api'

type Props = {
  open: boolean
  trips: TripWithMembers[]
  currentId: string | null
  onClose: () => void
  onPick: (tripId: string) => void
  onCreate: () => void
  onJoin: () => void
}

export function TripListSheet({
  open,
  trips,
  currentId,
  onClose,
  onPick,
  onCreate,
  onJoin,
}: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Your trips" maxHeight="88%">
      <div className="flex flex-col gap-2.5 mb-2">
        {trips.map((t) => {
          const active = t.id === currentId
          const initial = t.name.charAt(0).toUpperCase()
          return (
            <div
              key={t.id}
              className={
                'flex items-center gap-3 py-3 px-3.5 rounded-2xl border-[1.5px] bg-white cursor-pointer text-left transition-colors ' +
                (active
                  ? 'border-[var(--color-core-purple)]'
                  : 'border-[var(--color-border)]')
              }
              onClick={() => onPick(t.id)}
            >
              <span
                className="w-[42px] h-[42px] rounded-[13px] flex-shrink-0 flex items-center justify-center font-bold text-[16px]"
                style={{ background: '#CBA5FD', color: 'var(--color-uv-purple)' }}
              >
                {initial}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[15.5px] font-semibold tracking-tight text-[var(--color-fg-1)] truncate">
                  {t.name}
                </div>
                <div className="text-[12.5px] text-[var(--color-fg-2)] mt-1 flex items-center gap-1.5 flex-wrap">
                  <span>
                    {t.members.length}{' '}
                    {t.members.length === 1 ? 'member' : 'members'}
                  </span>
                  <span className="text-[var(--color-fg-3)]">·</span>
                  <CopyableCode code={t.code} />
                </div>
              </div>
              {active && (
                <span className="w-6 h-6 rounded-full bg-[var(--color-core-purple)] flex items-center justify-center flex-shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l4 4L19 6" />
                  </svg>
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-2.5 mt-4">
        <button
          onClick={onCreate}
          className="no-ring w-full py-4 rounded-full border-none bg-[var(--color-core-purple)] text-white font-semibold text-[15px] cursor-pointer"
        >
          Create a new trip
        </button>
        <button
          onClick={onJoin}
          className="no-ring w-full py-4 rounded-full bg-transparent text-[var(--color-core-purple)] font-semibold text-[15px] cursor-pointer border-[1.5px] border-[var(--color-core-purple)]"
        >
          Join with a code
        </button>
      </div>
    </Sheet>
  )
}
