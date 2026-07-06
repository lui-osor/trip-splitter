import { useEffect, useMemo, useState } from 'react'
import { useTrips } from '../hooks/useTrips'
import { useTripData } from '../hooks/useTripData'
import { BottomNav, type TabKey } from '../components/BottomNav'
import { computeBalances, computeSettlements } from '../lib/balances'
import { convert, fetchRates, formatMoney } from '../lib/currency'
import { supabase, IS_DEV } from '../lib/supabase'
import { AccountSheet } from './AccountSheet'
import { AddExpenseSheet } from './AddExpenseSheet'
import { ExpenseDetailSheet } from './ExpenseDetailSheet'
import { CreateTripSheet } from './CreateTripSheet'
import { JoinTripSheet } from './JoinTripSheet'
import { TripListSheet } from './TripListSheet'
import { FeedTab } from './tabs/FeedTab'
import { BalancesTab } from './tabs/BalancesTab'
import { SettleTab } from './tabs/SettleTab'
import { SummaryTab } from './tabs/SummaryTab'
import type { Profile } from '../lib/database.types'

type SheetKey =
  | 'none'
  | 'list'
  | 'create'
  | 'join'
  | 'add-expense'
  | 'expense-detail'
  | 'account'

type Props = {
  userId: string
  profile: Profile | null
  email: string
  refreshProfile: () => Promise<void>
}

// Display-toggle options in the header. Kept short intentionally.
const DISPLAY_CURRENCIES = ['COP', 'USD', 'EUR']

export function HomeScreen({ userId, profile, email, refreshProfile }: Props) {
  const { trips, currentTrip, loading, refresh, setCurrent } = useTrips(userId)
  void supabase // keep the export path exercised for realtime
  const { expenses, refresh: refreshExpenses } = useTripData(currentTrip?.id)

  const [tab, setTab] = useState<TabKey>('feed')
  const [sheet, setSheet] = useState<SheetKey>('none')
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null)
  const [displayCurrency, setDisplayCurrency] = useState<string | null>(null)
  const [simplify, setSimplify] = useState(true)
  const [rates, setRates] = useState<Record<string, number>>({})

  const displayName = profile?.name ?? email.split('@')[0]
  const hasTrips = trips.length > 0

  // Reset display currency when the trip changes (default to trip's base).
  useEffect(() => {
    if (currentTrip) setDisplayCurrency(currentTrip.base_currency)
  }, [currentTrip?.id, currentTrip?.base_currency])

  // Fetch rates in the display currency (recomputes when it changes).
  useEffect(() => {
    if (!displayCurrency) return
    fetchRates(displayCurrency).then(setRates)
  }, [displayCurrency])

  const displayCur = displayCurrency ?? currentTrip?.base_currency ?? 'EUR'

  // Header display-toggle: fixed set of COP / USD / EUR (Luisa's most-used).
  const currencyOptions = DISPLAY_CURRENCIES

  // Current user's trip_member row (if they've joined this trip)
  const currentMemberId = useMemo(() => {
    if (!currentTrip) return null
    return currentTrip.members.find((m) => m.user_id === userId)?.id ?? null
  }, [currentTrip?.id, userId])

  // Balances + settlements in the display currency
  const balances = useMemo(() => {
    if (!currentTrip || Object.keys(rates).length === 0) return []
    return computeBalances(currentTrip.members, expenses, displayCur, rates)
  }, [currentTrip?.id, currentTrip?.members, expenses, displayCur, rates])

  const settlements = useMemo(() => {
    if (!simplify) return computeSettlements(balances) // TODO: raw-pairwise mode
    return computeSettlements(balances)
  }, [balances, simplify])

  // Trip total (converted, in display currency)
  const tripTotal = useMemo(() => {
    if (!expenses.length) return 0
    return expenses.reduce(
      (sum, e) => sum + convert(e.amount, e.currency, displayCur, rates),
      0,
    )
  }, [expenses, displayCur, rates])

  const youBalance =
    balances.find((b) => b.memberId === currentMemberId)?.amount ?? 0

  const selectedExpense = useMemo(
    () => expenses.find((e) => e.id === selectedExpenseId) ?? null,
    [expenses, selectedExpenseId],
  )

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
  function handleAdded() {
    refreshExpenses()
    setSheet('none')
  }
  function handleExpenseDeleted() {
    refreshExpenses()
    setSelectedExpenseId(null)
    setSheet('none')
  }
  function openDetail(id: string) {
    setSelectedExpenseId(id)
    setSheet('expense-detail')
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
      <div className="bg-[var(--color-core-purple)] text-white px-6 pt-14 pb-5 flex-shrink-0">
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
                <span className="font-semibold text-[24px] tracking-tight text-white truncate">
                  {currentTrip.name}
                </span>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            ) : (
              <div className="font-semibold text-[24px] tracking-tight text-white mt-1">
                Trip Splitter
              </div>
            )}
            {hasTrips && currentTrip && (
              <div className="text-[12px] font-medium text-white/60 mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                {currentTrip.members.length}{' '}
                {currentTrip.members.length === 1 ? 'member' : 'members'}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2.5">
            <div className="flex items-center gap-2">
              {IS_DEV && (
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-white/15">
                  Dev
                </span>
              )}
              <button
                onClick={() => setSheet('account')}
                className="no-ring w-[38px] h-[38px] rounded-full border-2 border-white/40 bg-white/10 text-white font-bold text-[15px] cursor-pointer flex items-center justify-center"
                title="Account"
              >
                {displayName.charAt(0).toUpperCase()}
              </button>
            </div>
            {hasTrips && currentTrip && currencyOptions.length > 1 && (
              <div className="flex gap-0.5 bg-white/15 rounded-full p-0.5">
                {currencyOptions.map((c) => {
                  const selected = displayCur === c
                  return (
                    <button
                      key={c}
                      onClick={() => setDisplayCurrency(c)}
                      className="no-ring border-none cursor-pointer rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold"
                      style={{
                        background: selected ? 'white' : 'transparent',
                        color: selected ? 'var(--color-uv-purple)' : 'white',
                      }}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {hasTrips && currentTrip && (
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] font-medium text-white/60">
                Trip total
              </div>
              <div className="font-semibold text-[30px] tracking-tight mt-0.5 text-white tabular-nums">
                {formatMoney(tripTotal, displayCur)}
              </div>
            </div>
            <div className="text-right pb-1">
              <div className="text-[12px] font-medium text-white/60">
                {youBalance > 0.005
                  ? "You're owed"
                  : youBalance < -0.005
                    ? 'You owe'
                    : 'Your net'}
              </div>
              <div
                className="font-semibold text-[19px] tracking-tight mt-0.5 tabular-nums"
                style={{
                  color:
                    youBalance > 0.005
                      ? '#B7DD9F'
                      : youBalance < -0.005
                        ? '#F49E9E'
                        : 'rgba(255,255,255,0.9)',
                }}
              >
                {formatMoney(Math.abs(youBalance), displayCur)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto app-scroll px-6 pt-5 pb-24">
        {!hasTrips ? (
          <EmptyState
            onCreate={() => setSheet('create')}
            onJoin={() => setSheet('join')}
          />
        ) : currentTrip ? (
          <>
            {tab === 'feed' && (
              <FeedTab
                expenses={expenses}
                members={currentTrip.members}
                baseCurrency={displayCur}
                ratesInBase={rates}
                onSelectExpense={openDetail}
              />
            )}
            {tab === 'balances' && (
              <BalancesTab
                balances={balances}
                currentMemberId={currentMemberId}
                displayCurrency={displayCur}
              />
            )}
            {tab === 'settle' && (
              <SettleTab
                settlements={settlements}
                simplify={simplify}
                onToggleSimplify={() => setSimplify((s) => !s)}
                displayCurrency={displayCur}
                currentMemberId={currentMemberId}
              />
            )}
            {tab === 'summary' && (
              <SummaryTab
                expenses={expenses}
                members={currentTrip.members}
                displayCurrency={displayCur}
                ratesInDisplay={rates}
              />
            )}
          </>
        ) : null}
      </div>

      {/* Bottom nav — only when we have a trip */}
      {hasTrips && currentTrip && (
        <BottomNav
          tab={tab}
          onTab={(t) => setTab(t)}
          onAdd={() => setSheet('add-expense')}
        />
      )}

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
      {currentTrip && (
        <>
          <AddExpenseSheet
            open={sheet === 'add-expense'}
            tripId={currentTrip.id}
            baseCurrency={currentTrip.base_currency}
            members={currentTrip.members}
            currentUserId={userId}
            onClose={() => setSheet('none')}
            onAdded={handleAdded}
          />
          <ExpenseDetailSheet
            open={sheet === 'expense-detail'}
            expense={selectedExpense}
            members={currentTrip.members}
            baseCurrency={displayCur}
            ratesInBase={rates}
            onClose={() => setSheet('none')}
            onDeleted={handleExpenseDeleted}
          />
        </>
      )}
      <AccountSheet
        open={sheet === 'account'}
        profile={profile}
        email={email}
        userId={userId}
        trip={currentTrip}
        onClose={() => setSheet('none')}
        onProfileChanged={async () => {
          await Promise.all([refreshProfile(), refresh()])
        }}
        onTripLeft={async () => {
          await refresh()
          setSheet('none')
        }}
        onTripDeleted={async () => {
          await refresh()
          setSheet('none')
        }}
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

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="pt-16 text-center">
      <h3 className="mb-1.5">Coming soon</h3>
      <p className="text-[13.5px] text-[var(--color-fg-2)]">{label}</p>
    </div>
  )
}
