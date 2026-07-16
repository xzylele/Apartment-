create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  apartment_name text not null default 'Home Apartment',
  address text,
  phone text,
  default_water_rate numeric(10,2) not null default 0,
  default_electric_rate numeric(10,2) not null default 0,
  default_due_day smallint not null default 5 check (default_due_day between 1 and 28),
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists "staff read settings" on public.app_settings;
drop policy if exists "owner manages settings" on public.app_settings;
create policy "staff read settings" on public.app_settings for select to authenticated using (public.current_role() in ('owner','staff'));
create policy "owner manages settings" on public.app_settings for all to authenticated using (public.current_role() = 'owner') with check (public.current_role() = 'owner');
insert into public.app_settings (id) values (true) on conflict (id) do nothing;
