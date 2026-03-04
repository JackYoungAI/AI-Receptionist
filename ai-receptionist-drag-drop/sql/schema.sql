-- Run this in Supabase: SQL Editor → New Query → paste → Run

create table if not exists public.clients (
  id              uuid primary key default gen_random_uuid(),
  business_name   text not null,
  owner_name      text not null,
  industry        text not null,
  phone_number    text not null,
  services        text,
  hours_of_operation text,
  booking_link    text,
  faqs            jsonb default '[]'::jsonb,
  fallback_message text,
  status          text not null default 'trial',
  trial_start_date date default current_date,
  retell_agent_id text,
  retell_phone_number text,
  monthly_rate    numeric(10,2),
  -- Structured schedule for the AI agent (JSON): {"timezone":"America/New_York","appointment_duration_minutes":30,"hours":{"mon":{"open":"09:00","close":"17:00"},"tue":{...},"sun":null}}
  business_schedule jsonb,
  created_at      timestamptz default now()
);

create table if not exists public.workers (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  name            text not null,
  specialty       text,
  created_at      timestamptz default now()
);

create table if not exists public.appointments (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  worker_id       uuid references public.workers(id) on delete set null,
  start_time      timestamptz not null,
  end_time        timestamptz not null,
  customer_name   text,
  customer_phone  text,
  notes           text,
  created_at      timestamptz default now()
);

create index if not exists appointments_client_start_idx on public.appointments (client_id, start_time);
create index if not exists workers_client_idx on public.workers (client_id);
alter table public.workers enable row level security;
create policy "Admin full access on workers" on public.workers for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table if not exists public.call_logs (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid references public.clients(id) on delete cascade,
  caller_number    text,
  duration_seconds integer,
  transcript       text,
  summary          text,
  timestamp        timestamptz default now(),
  created_at       timestamptz default now()
);

create index if not exists call_logs_client_month_idx on public.call_logs (client_id, timestamp);

create or replace function public.get_client_minutes_this_month()
returns table (client_id uuid, minutes numeric)
language sql security definer as $$
  select client_id, coalesce(sum(duration_seconds) / 60.0, 0) as minutes
  from public.call_logs
  where date_part('month', timestamp) = date_part('month', now())
    and date_part('year', timestamp) = date_part('year', now())
  group by client_id;
$$;

alter table public.appointments enable row level security;

create policy "Admin full access on appointments" on public.appointments for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant execute on function public.get_client_minutes_this_month() to authenticated;
