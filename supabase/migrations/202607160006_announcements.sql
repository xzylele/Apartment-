create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(), title text not null, content text not null,
  published boolean not null default true, created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
drop policy if exists "everyone reads published announcements" on public.announcements;
drop policy if exists "staff manage announcements" on public.announcements;
create policy "everyone reads published announcements" on public.announcements for select to authenticated using (published or public.current_role() in ('owner','staff'));
create policy "staff manage announcements" on public.announcements for all to authenticated using (public.current_role() in ('owner','staff')) with check (public.current_role() in ('owner','staff'));
