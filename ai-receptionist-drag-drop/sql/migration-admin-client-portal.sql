-- Run in Supabase SQL Editor to add admin + client portal.

create table if not exists public.admins (
  email text primary key
);

create table if not exists public.client_users (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  email      text not null unique,
  created_at timestamptz default now()
);
create index if not exists client_users_email_idx on public.client_users (email);

alter table public.admins enable row level security;
alter table public.client_users enable row level security;

create policy "Authenticated can read admins" on public.admins for select to authenticated using (true);

create policy "Users can read own client_users row" on public.client_users for select to authenticated
  using (email = (auth.jwt() ->> 'email'));
create policy "Admins can manage client_users" on public.client_users for all to authenticated
  using ((select exists (select 1 from public.admins where email = (auth.jwt() ->> 'email'))))
  with check ((select exists (select 1 from public.admins where email = (auth.jwt() ->> 'email'))));

insert into public.admins (email) values ('jackthegamemaster@gmail.com') on conflict (email) do nothing;
