-- Trip Splitter initial schema
-- Idempotent: safe to re-run.

-- ---------- Tables ----------

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_currency text not null default 'EUR',
  participants jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null,
  paid_by text not null,
  split_type text not null check (split_type in ('even','unequal')),
  splits jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists expenses_trip_id_idx on expenses(trip_id);
create index if not exists expenses_created_at_idx on expenses(created_at desc);

-- ---------- Row Level Security ----------
-- Security model: anyone with the trip UUID (unguessable) can read/write that trip.
-- No auth is used; this is a shared ledger accessed via a shareable link.

alter table trips enable row level security;
alter table expenses enable row level security;

-- Trips: anon can do everything (trip UUID is the access token)
drop policy if exists "anon read trips" on trips;
drop policy if exists "anon insert trips" on trips;
drop policy if exists "anon update trips" on trips;
drop policy if exists "anon delete trips" on trips;

create policy "anon read trips"   on trips for select using (true);
create policy "anon insert trips" on trips for insert with check (true);
create policy "anon update trips" on trips for update using (true) with check (true);
create policy "anon delete trips" on trips for delete using (true);

-- Expenses: same access model
drop policy if exists "anon read expenses" on expenses;
drop policy if exists "anon insert expenses" on expenses;
drop policy if exists "anon update expenses" on expenses;
drop policy if exists "anon delete expenses" on expenses;

create policy "anon read expenses"   on expenses for select using (true);
create policy "anon insert expenses" on expenses for insert with check (true);
create policy "anon update expenses" on expenses for update using (true) with check (true);
create policy "anon delete expenses" on expenses for delete using (true);

-- ---------- Realtime ----------
-- Enable realtime for both tables so participants see live updates.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trips'
  ) then
    alter publication supabase_realtime add table trips;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expenses'
  ) then
    alter publication supabase_realtime add table expenses;
  end if;
end $$;
