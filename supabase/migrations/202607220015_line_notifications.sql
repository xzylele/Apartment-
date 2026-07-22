alter table public.app_settings
  add column if not exists line_admin_user_id text,
  add column if not exists line_link_code text,
  add column if not exists line_link_code_expires_at timestamptz;

comment on column public.app_settings.line_admin_user_id is 'LINE user ID of the administrator who receives operational notifications.';
