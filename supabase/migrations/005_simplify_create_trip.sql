-- ============================================================================
-- Simplify create_trip: drop placeholder-friend names, accept an optional
-- caller-provided code. The client generates the code locally when the user
-- taps "Add person" in the create sheet, so if they abandon before submitting
-- nothing hits the DB.
-- ============================================================================

drop function if exists public.create_trip(text, text, text[]);
drop function if exists public.create_trip(text, text, text[], text);

create or replace function public.create_trip(
  trip_name text,
  trip_base_currency text default 'EUR',
  provided_code text default null
)
returns table (
  id uuid,
  name text,
  base_currency text,
  code text,
  owner_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_trip_id uuid;
  user_name text;
  user_color text;
  final_code text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if trip_name is null or trim(trip_name) = '' then
    raise exception 'Trip name is required';
  end if;

  -- Normalize provided code (upper case, whitespace trimmed).
  if provided_code is not null and length(trim(provided_code)) >= 4 then
    final_code := upper(trim(provided_code));
  else
    final_code := public.gen_trip_code();
  end if;

  -- Fetch caller's profile for the owner-member row.
  select p.name, p.color into user_name, user_color
  from profiles p where p.id = auth.uid();
  if user_name is null or user_name = '' then user_name := 'You'; end if;
  if user_color is null then user_color := '#CBA5FD'; end if;

  -- Insert the trip. Unique-index on lower(code) enforces collision safety.
  insert into trips (name, base_currency, owner_id, code)
  values (trim(trip_name), coalesce(trip_base_currency, 'EUR'), auth.uid(), final_code)
  returning trips.id into new_trip_id;

  -- Owner is the sole initial member. Additional members join by code.
  insert into trip_members (trip_id, user_id, name, color)
  values (new_trip_id, auth.uid(), user_name, user_color);

  return query
    select t.id, t.name, t.base_currency, t.code, t.owner_id, t.created_at
    from trips t where t.id = new_trip_id;
end;
$$;

grant execute on function public.create_trip(text, text, text) to authenticated;
