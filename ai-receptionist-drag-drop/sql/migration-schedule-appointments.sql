-- Run this in Supabase if you already ran schema.sql before (adds schedule + appointments).

alter table public.clients
  add column if not exists business_schedule jsonb;

create table if not exists public.appointments (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  start_time      timestamptz not null,
  end_time        timestamptz not null,
  customer_name   text,
  customer_phone  text,
  notes           text,
  created_at      timestamptz default now()
);

create index if not exists appointments_client_start_idx on public.appointments (client_id, start_time);

alter table public.appointments enable row level security;

create policy "Admin full access on appointments" on public.appointments for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
