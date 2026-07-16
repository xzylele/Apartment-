-- Run in Supabase SQL Editor or through the Supabase CLI.
create type public.user_role as enum ('owner', 'staff', 'tenant');
create type public.room_status as enum ('vacant', 'occupied', 'maintenance');
create type public.invoice_status as enum ('draft', 'issued', 'paid', 'overdue', 'void');
create type public.maintenance_status as enum ('open', 'in_progress', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role public.user_role not null default 'tenant',
  created_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(), room_number text not null unique,
  floor smallint not null check (floor > 0), room_type text not null,
  size_sqm numeric(6,2), monthly_rent numeric(12,2) not null check (monthly_rent >= 0),
  deposit numeric(12,2) not null default 0, water_rate numeric(10,2) not null default 0,
  electric_rate numeric(10,2) not null default 0, status public.room_status not null default 'vacant',
  created_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.leases (
  id uuid primary key default gen_random_uuid(), room_id uuid not null references public.rooms(id),
  tenant_id uuid not null references public.profiles(id), start_date date not null, end_date date not null,
  rent_amount numeric(12,2) not null, deposit_amount numeric(12,2) not null default 0,
  active boolean not null default true, created_at timestamptz not null default now(),
  check (end_date > start_date)
);

create table public.meter_readings (
  id uuid primary key default gen_random_uuid(), room_id uuid not null references public.rooms(id),
  reading_month date not null, water_previous numeric(12,2) not null default 0,
  water_current numeric(12,2) not null default 0, electric_previous numeric(12,2) not null default 0,
  electric_current numeric(12,2) not null default 0, recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), unique(room_id, reading_month),
  check (water_current >= water_previous and electric_current >= electric_previous)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(), invoice_number text not null unique,
  room_id uuid not null references public.rooms(id), lease_id uuid references public.leases(id),
  billing_month date not null, due_date date not null, rent_amount numeric(12,2) not null default 0,
  water_amount numeric(12,2) not null default 0, electric_amount numeric(12,2) not null default 0,
  other_amount numeric(12,2) not null default 0, total_amount numeric(12,2) generated always as (rent_amount + water_amount + electric_amount + other_amount) stored,
  status public.invoice_status not null default 'draft', created_at timestamptz not null default now(),
  unique(room_id, billing_month)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id),
  amount numeric(12,2) not null check (amount > 0), paid_at timestamptz not null default now(),
  method text not null, reference text, recorded_by uuid references public.profiles(id)
);

create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(), room_id uuid not null references public.rooms(id),
  reported_by uuid references public.profiles(id), title text not null, description text,
  status public.maintenance_status not null default 'open', priority smallint not null default 2 check (priority between 1 and 3),
  created_at timestamptz not null default now(), completed_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.leases enable row level security;
alter table public.meter_readings enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.maintenance_requests enable row level security;

create function public.current_role() returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create policy "profile readable by self or staff" on public.profiles for select to authenticated using (id = auth.uid() or public.current_role() in ('owner', 'staff'));
create policy "staff manage rooms" on public.rooms for all to authenticated using (public.current_role() in ('owner', 'staff')) with check (public.current_role() in ('owner', 'staff'));
create policy "staff manage leases" on public.leases for all to authenticated using (public.current_role() in ('owner', 'staff')) with check (public.current_role() in ('owner', 'staff'));
create policy "staff manage readings" on public.meter_readings for all to authenticated using (public.current_role() in ('owner', 'staff')) with check (public.current_role() in ('owner', 'staff'));
create policy "staff manage invoices" on public.invoices for all to authenticated using (public.current_role() in ('owner', 'staff')) with check (public.current_role() in ('owner', 'staff'));
create policy "staff manage payments" on public.payments for all to authenticated using (public.current_role() in ('owner', 'staff')) with check (public.current_role() in ('owner', 'staff'));
create policy "staff manage maintenance" on public.maintenance_requests for all to authenticated using (public.current_role() in ('owner', 'staff')) with check (public.current_role() in ('owner', 'staff'));
create policy "tenant read own lease" on public.leases for select to authenticated using (tenant_id = auth.uid());
create policy "tenant read own invoices" on public.invoices for select to authenticated using (lease_id in (select id from public.leases where tenant_id = auth.uid()));
create policy "tenant read own payments" on public.payments for select to authenticated using (invoice_id in (select i.id from public.invoices i join public.leases l on l.id = i.lease_id where l.tenant_id = auth.uid()));
create policy "tenant create own maintenance" on public.maintenance_requests for insert to authenticated with check (reported_by = auth.uid());
create policy "tenant read own maintenance" on public.maintenance_requests for select to authenticated using (reported_by = auth.uid());
