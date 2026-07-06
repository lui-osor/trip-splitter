import { useState } from 'react'
import { signOut } from '../hooks/useAuth'
import { useTrips } from '../hooks/useTrips'
import { CopyableCode } from '../components/CopyableCode'
import { IS_DEV } from '../lib/supabase'
import { CreateTripSheet } from './CreateTripSheet'
import { JoinTripSheet } from './JoinTripSheet'
import { TripListSheet } from './TripListSheet'
import type { Profile } from '../lib/database.types'

type SheetKey = 'none' | 'list' | 'create' | 'join'

type Props = {
  userId: string
  profile: Profile | null
  email: string
}

export function HomeScreen({ userId, profile, email }: Props) {
  const { trips, currentTrip, loading, refresh, setCurrent } = useTrips(userId)
  const [sheet, setSheet] = useState<SheetKey>('none')

  const displayName = profile?.name ?? email.split('@')[0]
  const hasTrips = trips.length > 0

  async function handleCreated(tripId: string) {
    await refresh()
    setCurrent(tripId)
    setSheet('none')
  }

  async function handleJoined(tripId: string) {
    await refresh()
    setCurrent(tripId)
    setSheet('none')
  }

  function handlePickTrip(tripId: string) {
    setCurrent(tripId)
    setSheet('none')
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-[var(--color-fg-3)] text-[14px]">Loading trips…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="bg-[var(--color-core-purple)] text-white px-6 pt-14 pb-6 flex-shrink-0">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider font-medium text-white/60">
              {hasTrips ? 'Your trip' : `Welcome, ${displayName}`}
            </div>
            {hasTrips && currentTrip ? (
              <button
                onClick={() => setSheet('list')}
                className="no-ring bg-transparent border-none p-0 mt-1 cursor-pointer text-left flex items-center gap-1.5 max-w-full"
              >
                <span
                  className="font-semibold text-[26px] tracking-tight text-white truncate"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {currentTrip.name}
                </span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            ) : (
              <div
                className="font-semibold text-[26px] tracking-tight text-white mt-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Trip Splitter
              </div>
            )}
            {hasTrips && currentTrip && (
              <div className="text-[12px] font-medium text-white/60 mt-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                {currentTrip.members.length}{' '}
                {currentTrip.members.length === 1 ? 'member' : 'members'}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {IS_DEV && (
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-white/15">
                Dev
              </span>
            )}
            <button
              onClick={() => signOut()}
              className="no-ring w-[38px] h-[38px] rounded-full border-2 border-white/40 bg-white/10 text-white font-bold text-[15px] cursor-pointer flex items-center justify-center"
              title={`${displayName} — tap to log out`}
            >
              {displayName.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto app-scroll px-6 py-6 pb-24">
        {!hasTrips ? (
          <EmptyState
            onCreate={() => setSheet('create')}
            onJoin={() => setSheet('join')}
          />
        ) : currentTrip ? (
          <ActiveTripBody trip={currentTrip} />
        ) : null}
      </div>

      {/* Sheets */}
      <TripListSheet
        open={sheet === 'list'}
        trips={trips}
        currentId={currentTrip?.id ?? null}
        onClose={() => setSheet('none')}
        onPick={handlePickTrip}
        onCreate={() => setSheet('create')}
        onJoin={() => setSheet('join')}
      />
      <CreateTripSheet
        open={sheet === 'create'}
        onClose={() => setSheet('none')}
        onBack={() => setSheet(hasTrips ? 'list' : 'none')}
        onCreated={handleCreated}
      />
      <JoinTripSheet
        open={sheet === 'join'}
        onClose={() => setSheet('none')}
        onBack={() => setSheet(hasTrips ? 'list' : 'none')}
        onJoined={handleJoined}
      />
    </div>
  )
}

function EmptyState({
  onCreate,
  onJoin,
}: {
  onCreate: () => void
  onJoin: () => void
}) {
  return (
    <div className="pt-6">
      <h2 className="mb-2">Start your first trip</h2>
      <p className="text-[15px] text-[var(--color-fg-2)] mb-6">
        Create a trip to invite friends, or join one someone else has already made.
      </p>
      <div className="flex flex-col gap-2.5">
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
    </div>
  )
}

function ActiveTripBody({
  trip,
}: {
  trip: { name: string; code: string; base_currency: string; members: { name: string; color: string }[] }
}) {
  return (
    <div>
      <CopyableCode code={trip.code} variant="prominent" />

      <div className="mt-5 mb-2 text-[13px] font-semibold text-[var(--color-fg-2)]">
        Members
      </div>
      <div className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden">
        {trip.members.map((m, i) => (
          <div
            key={i}
            className={
              'flex items-center gap-3 px-4 py-3 ' +
              (i < trip.members.length - 1
                ? 'border-b border-[var(--color-divider)]'
                : '')
            }
          >
            <span
              className="w-[34px] h-[34px] rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[13px]"
              style={{ background: m.color, color: 'var(--color-uv-purple)' }}
            >
              {m.name.charAt(0).toUpperCase()}
            </span>
            <span className="flex-1 text-[14.5px] font-medium">{m.name}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 p-5 bg-white border border-[var(--color-border)] rounded-2xl shadow-[0_1px_2px_rgba(30,0,47,0.06)]">
        <div className="text-[13px] font-semibold text-[var(--color-fg-2)] uppercase tracking-wider mb-2">
          Coming next
        </div>
        <h3 className="mb-3">Add expenses</h3>
        <p className="text-[14px] text-[var(--color-fg-2)]">
          Phase 4E builds the Feed, Balances, Settle, and Summary tabs plus the
          Add-expense sheet with categories and split types.
        </p>
      </div>
    </div>
  )
}
