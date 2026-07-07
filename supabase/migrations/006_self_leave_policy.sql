-- ============================================================================
-- Allow a member to delete their own trip_members row (self-leave).
-- Previously only the trip owner could delete member rows, so leaveTrip()
-- was silently no-op'ing for non-owners.
-- ============================================================================

drop policy if exists "tm: self can leave" on trip_members;

create policy "tm: self can leave"
  on trip_members for delete
  using (auth.uid() is not null and auth.uid() = user_id);
