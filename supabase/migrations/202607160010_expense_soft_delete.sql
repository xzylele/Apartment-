alter table public.expenses add column if not exists deleted_at timestamptz;
