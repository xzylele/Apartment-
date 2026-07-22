create table if not exists public.line_notification_logs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  recipient_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.line_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_log_id uuid not null references public.line_notification_logs(id) on delete cascade,
  connection_id uuid references public.line_admin_connections(id) on delete set null,
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.line_notification_logs enable row level security;
alter table public.line_notification_deliveries enable row level security;

drop policy if exists "managers read line notification logs" on public.line_notification_logs;
create policy "managers read line notification logs" on public.line_notification_logs
  for select to authenticated using (public.current_role() in ('owner', 'staff'));

drop policy if exists "managers create line notification logs" on public.line_notification_logs;
create policy "managers create line notification logs" on public.line_notification_logs
  for insert to authenticated with check (public.current_role() in ('owner', 'staff'));

drop policy if exists "managers read line notification deliveries" on public.line_notification_deliveries;
create policy "managers read line notification deliveries" on public.line_notification_deliveries
  for select to authenticated using (public.current_role() in ('owner', 'staff'));

drop policy if exists "managers create line notification deliveries" on public.line_notification_deliveries;
create policy "managers create line notification deliveries" on public.line_notification_deliveries
  for insert to authenticated with check (public.current_role() in ('owner', 'staff'));

create index if not exists line_notification_logs_created_at_idx on public.line_notification_logs(created_at desc);
create index if not exists line_notification_deliveries_log_id_idx on public.line_notification_deliveries(notification_log_id);
