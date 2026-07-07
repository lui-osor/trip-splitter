import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Sheet } from '../components/Sheet'
import {
  deleteTrip,
  leaveTrip,
  removeTripMember,
  renameTripMember,
  updateProfileName,
} from '../lib/api'
import { errorMessage } from '../lib/errors'
import { signOut } from '../hooks/useAuth'
import type { Profile } from '../lib/database.types'
import type { TripWithMembers } from '../lib/api'
import type { NetBalance } from '../lib/balances'

type Props = {
  open: boolean
  profile: Profile | null
  email: string
  userId: string
  trip: TripWithMembers | null
  balances: NetBalance[]
  onClose: () => void
  onProfileChanged: () => Promise<void> | void
  onTripLeft: () => Promise<void> | void
  onTripDeleted: () => Promise<void> | void
  onMemberRemoved: () => Promise<void> | void
}

// A member is settled iff their net balance rounds to 0 in the display currency.
const SETTLED_EPSILON = 0.01

export function AccountSheet({
  open,
  profile,
  email,
  userId,
  trip,
  balances,
  onClose,
  onProfileChanged,
  onTripLeft,
  onTripDeleted,
  onMemberRemoved,
}: Props) {
  const [name, setName] = useState(profile?.name ?? '')
  const [myMemberName, setMyMemberName] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwner = trip?.owner_id === userId
  const myMemberId = trip?.members.find((m) => m.user_id === userId)?.id ?? null

  useEffect(() => {
    setName(profile?.name ?? '')
  }, [profile?.name])

  useEffect(() => {
    if (!trip) return
    const self = trip.members.find((m) => m.user_id === userId)
    setMyMemberName(self?.name ?? profile?.name ?? '')
  }, [trip?.id, trip?.members, userId, profile?.name])

  function balanceFor(memberId: string): number {
    return balances.find((b) => b.memberId === memberId)?.amount ?? 0
  }

  function isSettled(memberId: string): boolean {
    return Math.abs(balanceFor(memberId)) < SETTLED_EPSILON
  }

  async function saveNameChanges() {
    setError(null)
    setSaving(true)
    try {
      const tasks: Promise<unknown>[] = []
      // Profile name change (used everywhere the user appears on other trips too)
      if (name.trim() && name.trim() !== (profile?.name ?? '')) {
        tasks.push(updateProfileName(name))
      }
      // Rename the current user's member row for THIS trip (independent).
      if (myMemberId) {
        const current = trip?.members.find((m) => m.id === myMemberId)
        if (myMemberName.trim() && myMemberName.trim() !== current?.name) {
          tasks.push(renameTripMember(myMemberId, myMemberName))
        }
      }
      if (tasks.length > 0) {
        await Promise.all(tasks)
        await onProfileChanged()
      }
    } catch (err) {
      setError(errorMessage(err, 'Failed to save changes'))
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!isSettled(memberId)) {
      alert(
        `${memberName} still has a pending balance on this trip. Settle it up first, then try removing them again.`,
      )
      return
    }
    if (!confirm(`Remove ${memberName} from the trip?`)) return
    try {
      await removeTripMember(memberId)
      await onMemberRemoved()
    } catch (err) {
      alert(errorMessage(err, 'Failed to remove member'))
    }
  }

  async function handleLeave() {
    if (!trip) return
    if (myMemberId && !isSettled(myMemberId)) {
      alert(
        `You still have a pending balance on this trip. Settle up first, then try leaving again.`,
      )
      return
    }
    if (!confirm(`Leave "${trip.name}"? You can rejoin later with the code.`))
      return
    try {
      await leaveTrip(trip.id)
      await onTripLeft()
    } catch (err) {
      alert(errorMessage(err, 'Failed to leave trip'))
    }
  }

  async function handleDelete() {
    if (!trip) return
    if (
      !confirm(
        `Delete "${trip.name}" permanently? This removes ALL expenses and cannot be undone.`,
      )
    )
      return
    try {
      await deleteTrip(trip.id)
      await onTripDeleted()
    } catch (err) {
      alert(errorMessage(err, 'Failed to delete trip'))
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Account" maxHeight="92%">
      {/* User row */}
      <div className="flex items-center gap-3.5 pb-4 border-b border-[var(--color-divider)]">
        <Avatar name={profile?.name ?? email} color={profile?.color ?? '#CBA5FD'} size={56} />
        <div className="min-w-0">
          <div className="text-[17px] font-semibold tracking-tight truncate">
            {profile?.name || email.split('@')[0]}
          </div>
          <div className="text-[13px] text-[var(--color-fg-2)] mt-0.5 truncate">
            {email}
          </div>
        </div>
      </div>

      {/* Your name (account-wide) */}
      <div className="text-[13px] font-semibold text-[var(--color-fg-2)] mt-5 mb-2">
        Your name
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full box-border bg-white border border-[var(--color-border)] rounded-xl px-4 py-3 text-[15.5px] text-[var(--color-fg-1)]"
      />
      <p className="text-[12px] text-[var(--color-fg-3)] mt-1.5">
        Shown across all your trips.
      </p>

      {/* Trip members (only your row is editable; others are read-only) */}
      {trip && trip.members.length > 0 && (
        <>
          <div className="text-[13px] font-semibold text-[var(--color-fg-2)] mt-5 mb-2">
            Trip members
          </div>
          <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden">
            {trip.members.map((m, idx) => {
              const isSelf = m.user_id === userId
              const memberSettled = isSettled(m.id)
              const canOwnerRemove = isOwner && !isSelf
              return (
                <div
                  key={m.id}
                  className={
                    'flex items-center gap-3 py-2.5 px-3 ' +
                    (idx < trip.members.length - 1
                      ? 'border-b border-[var(--color-divider)]'
                      : '')
                  }
                >
                  <Avatar name={m.name} color={m.color} size={34} />
                  {isSelf ? (
                    <input
                      value={myMemberName}
                      onChange={(e) => setMyMemberName(e.target.value)}
                      className="flex-1 min-w-0 border-none bg-transparent text-[14.5px] font-medium py-1.5 focus:outline-none no-ring"
                      aria-label="Your name on this trip"
                    />
                  ) : (
                    <span className="flex-1 min-w-0 text-[14.5px] font-medium truncate">
                      {m.name}
                    </span>
                  )}
                  {isSelf && (
                    <span className="text-[11px] uppercase font-semibold text-[var(--color-fg-3)] tracking-wider">
                      You
                    </span>
                  )}
                  {canOwnerRemove && (
                    <button
                      onClick={() => handleRemoveMember(m.id, m.name)}
                      title={
                        memberSettled
                          ? 'Remove from trip'
                          : 'Cannot remove — pending balance'
                      }
                      className={
                        'no-ring w-[30px] h-[30px] rounded-full flex items-center justify-center border-none flex-shrink-0 ' +
                        (memberSettled
                          ? 'bg-[var(--color-danger-soft)] cursor-pointer'
                          : 'bg-[var(--color-grey-100)] cursor-not-allowed opacity-60')
                      }
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={memberSettled ? 'var(--color-danger)' : 'var(--color-fg-3)'}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      >
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {isOwner && (
            <p className="text-[12px] text-[var(--color-fg-3)] mt-2">
              As the trip owner, you can remove other members once they've settled
              up.
            </p>
          )}
        </>
      )}

      {error && (
        <p className="text-[13.5px] text-[var(--color-danger)] font-medium mt-3">
          {error}
        </p>
      )}

      <button
        onClick={saveNameChanges}
        disabled={saving}
        className={
          'no-ring w-full mt-4 py-3.5 rounded-full border-none font-semibold text-[15px] tracking-tight ' +
          (saving
            ? 'bg-[var(--color-grey-200)] text-[var(--color-fg-3)] cursor-not-allowed'
            : 'bg-[var(--color-core-purple)] text-white cursor-pointer')
        }
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>

      {/* Trip actions */}
      {trip && (
        <>
          <div className="text-[13px] font-semibold text-[var(--color-fg-2)] mt-6 mb-2">
            This trip
          </div>
          {isOwner ? (
            <button
              onClick={handleDelete}
              className="no-ring w-full py-3.5 rounded-full bg-transparent text-[var(--color-danger)] font-semibold text-[15px] cursor-pointer border-[1.5px] border-[var(--color-danger)]"
            >
              Delete this trip
            </button>
          ) : (
            <button
              onClick={handleLeave}
              className="no-ring w-full py-3.5 rounded-full bg-transparent text-[var(--color-danger)] font-semibold text-[15px] cursor-pointer border-[1.5px] border-[var(--color-danger)]"
            >
              Leave this trip
            </button>
          )}
        </>
      )}

      <button
        onClick={() => signOut()}
        className="no-ring w-full mt-2.5 py-3.5 rounded-full bg-[var(--color-grey-100)] text-[var(--color-fg-1)] font-semibold text-[15px] cursor-pointer border-none"
      >
        Log out
      </button>
    </Sheet>
  )
}
