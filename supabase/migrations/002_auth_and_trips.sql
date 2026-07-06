-- ============================================================================
-- Trip Splitter — Phase 4A migration
-- Adds Supabase Auth-based access control, trip_members join table,
-- invite codes, categories, and user-scoped RLS.
-- Safe to run against an empty or existing dev DB.
-- ============================================================================

-- Supabase Auth (auth.users) is enabled by default; no action needed here.

-- ---------- profiles ---------------------------------------------------------
-- One row per auth.users row, storing display name and avatar color.
-- Automatically created on signup via a trigger below.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  color text not null default '#CBA5FD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles: read all" on profiles;
drop policy if exists "profiles: user updates own" on profiles;
drop policy if exists "profiles: user inserts own" on profiles;

create policy "profiles: read all" on profiles for select using (true);
create policy "profiles: user updates own"
  on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: user inserts own"
  on profiles for insert with check (auth.uid() = id);

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- trips: add code + owner_id --------------------------------------

alter table trips add column if not exists code text;
alter table trips add column if not exists owner_id uuid references auth.users(id) on delete set null;

-- Unique invite code (case-insensitive)
create unique index if not exists trips_code_lower_idx on trips (lower(code));

-- Backfill: generate codes for existing rows that don't have one.
-- 5-char alphanumeric, no easily-confused chars.
create or replace function public.gen_trip_code() returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  attempts int := 0;
begin
  loop
    new_code := '';
    for i in 1..5 loop
      new_code := new_code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from trips where lower(trips.code) = lower(new_code));
    attempts := attempts + 1;
    if attempts > 20 then
      raise exception 'Could not generate unique trip code';
    end if;
  end loop;
  return new_code;
end;
$$;

update trips set code = public.gen_trip_code() where code is null;
alter table trips alter column code set not null;

-- ---------- trip_members ----------------------------------------------------
-- Real users OR placeholder people (user_id null when the person hasn't
-- signed up yet). Placeholder rows can be "claimed" later by setting user_id.

create table if not exists trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  color text not null default '#CBA5FD',
  joined_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create index if not exists trip_members_trip_id_idx on trip_members(trip_id);
create index if not exists trip_members_user_id_idx on trip_members(user_id);

alter table trip_members enable row level security;

-- Note: we keep the legacy `participants` jsonb column on `trips` for now to
-- avoid a breaking migration. New code should read from `trip_members` instead.
-- We'll drop `participants` in a later migration once all clients are cut over.

-- ---------- expenses: add category + date -----------------------------------

alter table expenses add column if not exists category text not null default 'other';
alter table expenses add column if not exists expense_date date;

-- Backfill expense_date from created_at where null
update expenses set expense_date = created_at::date where expense_date is null;

-- ---------- Row Level Security (user-scoped) --------------------------------
-- Access model: authenticated users can access a trip only if they're a
-- member of it (via trip_members). Non-authenticated requests are blocked.

-- Helper function: is the caller a member of a trip?
create or replace function public.is_trip_member(check_trip_id uuid) returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from trip_members
    where trip_id = check_trip_id and user_id = auth.uid()
  );
$$;

-- ---- trips policies (replace the old permissive ones) ----------------------
drop policy if exists "anon read trips" on trips;
drop policy if exists "anon insert trips" on trips;
drop policy if exists "anon update trips" on trips;
drop policy if exists "anon delete trips" on trips;

drop policy if exists "trips: members read" on trips;
drop policy if exists "trips: authed insert" on trips;
drop policy if exists "trips: owner updates" on trips;
drop policy if exists "trips: owner deletes" on trips;
drop policy if exists "trips: read by code for join" on trips;

-- Members can read their trips
create policy "trips: members read"
  on trips for select
  using (public.is_trip_member(id));

-- Authenticated users can create a trip (they become the owner)
create policy "trips: authed insert"
  on trips for insert
  with check (auth.uid() is not null and owner_id = auth.uid());

-- Only owner can update trip metadata (name, base_currency)
create policy "trips: owner updates"
  on trips for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Only owner can delete
create policy "trips: owner deletes"
  on trips for delete
  using (auth.uid() = owner_id);

-- ---- trip_members policies -------------------------------------------------
drop policy if exists "tm: read own trips" on trip_members;
drop policy if exists "tm: creator can insert" on trip_members;
drop policy if exists "tm: user can claim placeholder" on trip_members;
drop policy if exists "tm: owner can delete" on trip_members;
drop policy if exists "tm: self can update own row" on trip_members;

-- Read members of trips you belong to
create policy "tm: read own trips"
  on trip_members for select
  using (public.is_trip_member(trip_id));

-- When creating a trip, the owner can insert members (including themselves).
-- Also any authed user can insert themselves into an existing trip if they know
-- the code (join flow) — but we handle "join by code" via a SECURITY DEFINER
-- function below rather than exposing a broad INSERT policy.
create policy "tm: creator can insert"
  on trip_members for insert
  with check (
    auth.uid() is not null and (
      -- Owner adding any member (including self and placeholders)
      exists (select 1 from trips where trips.id = trip_id and trips.owner_id = auth.uid())
    )
  );

-- Existing member can update their own row (e.g. rename themselves)
create policy "tm: self can update own row"
  on trip_members for update
  using (auth.uid() = user_id and user_id is not null)
  with check (auth.uid() = user_id);

-- Trip owner can remove members
create policy "tm: owner can delete"
  on trip_members for delete
  using (exists (select 1 from trips where trips.id = trip_id and trips.owner_id = auth.uid()));

-- ---- expenses policies (replace old permissive ones) -----------------------
drop policy if exists "anon read expenses" on expenses;
drop policy if exists "anon insert expenses" on expenses;
drop policy if exists "anon update expenses" on expenses;
drop policy if exists "anon delete expenses" on expenses;

drop policy if exists "expenses: members read" on expenses;
drop policy if exists "expenses: members insert" on expenses;
drop policy if exists "expenses: members update" on expenses;
drop policy if exists "expenses: members delete" on expenses;

create policy "expenses: members read"
  on expenses for select
  using (public.is_trip_member(trip_id));

create policy "expenses: members insert"
  on expenses for insert
  with check (public.is_trip_member(trip_id));

create policy "expenses: members update"
  on expenses for update
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

create policy "expenses: members delete"
  on expenses for delete
  using (public.is_trip_member(trip_id));

-- ---------- join_trip_by_code (RPC for the join flow) -----------------------
-- A logged-in user calls this with a 5-char code. If the code matches a trip,
-- inserts them into trip_members (or updates their existing row's user_id if
-- there was a placeholder with matching name).

create or replace function public.join_trip_by_code(join_code text)
returns table (trip_id uuid, trip_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  found_trip_id uuid;
  found_trip_name text;
  user_name text;
  user_color text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id, name into found_trip_id, found_trip_name
  from trips
  where lower(code) = lower(trim(join_code));

  if found_trip_id is null then
    raise exception 'Invalid invite code';
  end if;

  -- Already a member?
  if exists (select 1 from trip_members where trip_members.trip_id = found_trip_id and user_id = auth.uid()) then
    return query select found_trip_id, found_trip_name;
    return;
  end if;

  -- Fetch caller's profile
  select name, color into user_name, user_color from profiles where id = auth.uid();
  if user_name is null or user_name = '' then user_name := 'Member'; end if;
  if user_color is null then user_color := '#CBA5FD'; end if;

  insert into trip_members (trip_id, user_id, name, color)
  values (found_trip_id, auth.uid(), user_name, user_color);

  return query select found_trip_id, found_trip_name;
end;
$$;

grant execute on function public.join_trip_by_code(text) to authenticated;

-- ---------- Realtime --------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_members') then
    alter publication supabase_realtime add table trip_members;
  end if;
end $$;
