create table public.expenses (
  id uuid primary key default gen_random_uuid(), expense_date date not null default current_date,
  category text not null, description text, amount numeric(12,2) not null check (amount > 0),
  recorded_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table public.announcements (
  id uuid primary key default gen_random_uuid(), title text not null, content text not null,
  published boolean not null default true, created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.expenses enable row level security;
alter table public.announcements enable row level security;
create policy "staff manage expenses" on public.expenses for all to authenticated using (public.current_role() in ('owner','staff')) with check (public.current_role() in ('owner','staff'));
create policy "everyone reads published announcements" on public.announcements for select to authenticated using (published or public.current_role() in ('owner','staff'));
create policy "staff manage announcements" on public.announcements for all to authenticated using (public.current_role() in ('owner','staff')) with check (public.current_role() in ('owner','staff'));
