create table if not exists public.utility_bills (
  id uuid primary key default gen_random_uuid(),
  bill_month date not null,
  utility_type text not null check (utility_type in ('water','electric')),
  provider_units numeric(14,2) not null default 0 check (provider_units >= 0),
  amount numeric(14,2) not null default 0 check (amount >= 0),
  due_date date,
  paid_date date,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bill_month, utility_type)
);

alter table public.utility_bills enable row level security;
drop policy if exists "owner manages utility bills" on public.utility_bills;
create policy "owner manages utility bills" on public.utility_bills
for all to authenticated
using (public.current_role() = 'owner')
with check (public.current_role() = 'owner');

