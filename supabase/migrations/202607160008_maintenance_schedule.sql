alter table public.maintenance_requests
  add column if not exists scheduled_date date not null default current_date;
