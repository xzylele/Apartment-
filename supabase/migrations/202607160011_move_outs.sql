
create table if not exists public.lease_move_outs (
  id uuid primary key default gen_random_uuid(), lease_id uuid not null references public.leases(id),
  moved_out_at date not null default current_date, deposit_amount numeric(12,2) not null default 0,
  deduction_amount numeric(12,2) not null default 0, refund_amount numeric(12,2) not null default 0,
  note text, recorded_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
alter table public.lease_move_outs enable row level security;
drop policy if exists "staff manage move outs" on public.lease_move_outs;
create policy "staff manage move outs" on public.lease_move_outs for all to authenticated using (public.current_role() in ('owner','staff')) with check (public.current_role() in ('owner','staff'));