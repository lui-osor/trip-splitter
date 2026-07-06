-- Fix: trips.code needs a DEFAULT so client inserts auto-generate a code.
-- Without this, INSERT into trips fails with a NOT NULL violation.

alter table trips alter column code set default public.gen_trip_code();
