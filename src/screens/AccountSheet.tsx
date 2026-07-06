import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Sheet } from '../components/Sheet'
import {
  deleteTrip,
  leaveTrip,
  renameTripMember,
  updateProfileName,
} from '../lib/api'
import { errorMessage } from '../lib/errors'
import { signOut } from '../hooks/useAuth'
import type { Profile, TripMember } from '../lib/database.types'
import type { TripWithMembers } from '../lib/api'

type Props = {
  open: boolean
  profile: Profile | null
  email: string
  userId: string
  trip: TripWithMembers | null
  onClose: () => void
  onProfileChanged: () => Promise<void> | void
  onTripLeft: () => Promise<void> | void
  onTripDeleted: () => Promise<void> | void
}

export function AccountSheet({
  open,
  profile,
  email,
  userId,
  trip,
  onClose,
  onProfileChanged,
  onTripLeft,
  onTripDeleted,
}: Props) {
  const [name, setName] = useState(profile?.name ?? '')
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(profile?.name ?? '')
  }, [profile?.name])

  useEffect(() => {
    if (!trip) return
    setMemberNames(
      Object.fromEntries(trip.members.map((m) => [m.id, m.name])),
    )
  }, [trip?.id, trip?.members])

  const isOwner = trip?.owner_id === userId

  async function saveNameChanges() {
    setError(null)
    setSaving(true)
    try {
      const tasks: Promise<unknown>[] = []
      // Profile name change
      if (name.trim() && name.trim() !== (profile?.name ?? '')) {
        tasks.push(updateProfileName(name))
      }
      // Member name changes
      if (trip) {
        for (const m of trip.members) {
          const next = memberNames[m.id]
          if (next !== undefined && next.trim() && next.trim() !== m.name) {
            tasks.push(renameTripMember(m.id, next))
          }
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

  async function handleLeave() {
    if (!trip) return
    if (!confirm(`Leave "${trip.name}"? You can rejoin later with the code.`)) return
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

      {/* Your name */}
      <div className="text-[13px] font-semibold text-[var(--color-fg-2)] mt-5 mb-2">
        Your name
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full box-border bg-white border border-[var(--color-border)] rounded-xl px-4 py-3 text-[15.5px] text-[var(--color-fg-1)]"
      />

      {/* Trip members (renameable) */}
      {trip && trip.members.length > 0 && (
        <>
          <div className="text-[13px] font-semibold text-[var(--color-fg-2)] mt-5 mb-2">
            Trip members
          </div>
          <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden">
            {trip.members.map((m, idx) => (
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
                <input
                  value={memberNames[m.id] ?? m.name}
                  onChange={(e) =>
                    setMemberNames((prev) => ({ ...prev, [m.id]: e.target.value }))
                  }
                  className="flex-1 min-w-0 border-none bg-transparent text-[14.5px] font-medium py-1.5 focus:outline-none no-ring"
                />
                {m.user_id === userId && (
                  <span className="text-[11px] uppercase font-semibold text-[var(--color-fg-3)] tracking-wider">
                    You
                  </span>
                )}
              </div>
            ))}
          </div>
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
