alter table public.expenses
  add column if not exists room_id uuid references public.rooms(id);

create index if not exists expenses_room_id_idx
  on public.expenses(room_id);
