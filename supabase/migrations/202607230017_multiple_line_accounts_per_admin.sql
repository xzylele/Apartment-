alter table public.line_admin_connections
  drop constraint if exists line_admin_connections_profile_id_key;

create index if not exists line_admin_connections_profile_id_idx
  on public.line_admin_connections(profile_id);
