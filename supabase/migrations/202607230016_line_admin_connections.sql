create table if not exists public.line_admin_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  line_user_id text unique,
  link_code text unique,
  link_code_expires_at timestamptz,
  enabled boolean not null default true,
  linked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.line_admin_connections enable row level security;

drop policy if exists "managers read line connections" on public.line_admin_connections;
create policy "managers read line connections" on public.line_admin_connections
  for select to authenticated
  using (public.current_role() in ('owner', 'staff'));

drop policy if exists "managers manage own line connection" on public.line_admin_connections;
create policy "managers manage own line connection" on public.line_admin_connections
  for all to authenticated
  using (profile_id = auth.uid() or public.current_role() = 'owner')
  with check (profile_id = auth.uid() or public.current_role() = 'owner');

insert into public.line_admin_connections (profile_id, line_user_id, enabled, linked_at)
select p.id, s.line_admin_user_id, true, now()
from public.app_settings s
cross join lateral (
  select id from public.profiles where role = 'owner' order by created_at limit 1
) p
where s.id = true and s.line_admin_user_id is not null
on conflict (profile_id) do nothing;
