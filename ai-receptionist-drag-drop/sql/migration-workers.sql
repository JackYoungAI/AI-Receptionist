-- Run in Supabase SQL Editor to add workers and worker_id to appointments.

create table if not exists public.workers (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  name            text not null,
  specialty       text,
  created_at      timestamptz default now()
);

alter table public.appointments
  add column if not exists worker_id uuid references public.workers(id) on delete set null;

create index if not exists workers_client_idx on public.workers (client_id);

alter table public.workers enable row level security;
create policy "Admin full access on workers" on public.workers for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
