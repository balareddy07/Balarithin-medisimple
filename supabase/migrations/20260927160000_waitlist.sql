-- Waitlist for early access / fake-door demand testing.
-- RLS: anyone (anon + authenticated) may INSERT; nobody may read via the API.
-- Reads happen in the Supabase dashboard (Table Editor) by the team only.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  role text not null default 'family'
    check (role in ('patient', 'family', 'doctor', 'hospital')),
  country text,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);

-- Dedupe guard: one row per email keeps the list honest.
create unique index if not exists waitlist_email_unique_idx on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

drop policy if exists "Anyone can join the waitlist" on public.waitlist;
create policy "Anyone can join the waitlist"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

-- NOTE: deliberately no SELECT / UPDATE / DELETE policies: no public read.
