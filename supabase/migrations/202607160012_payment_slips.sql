alter table public.payments
  add column if not exists slip_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-slips',
  'payment-slips',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff read payment slips" on storage.objects;
create policy "staff read payment slips"
on storage.objects for select to authenticated
using (bucket_id = 'payment-slips' and public.current_role() in ('owner', 'staff'));

drop policy if exists "staff upload payment slips" on storage.objects;
create policy "staff upload payment slips"
on storage.objects for insert to authenticated
with check (bucket_id = 'payment-slips' and public.current_role() in ('owner', 'staff'));

drop policy if exists "staff update payment slips" on storage.objects;
create policy "staff update payment slips"
on storage.objects for update to authenticated
using (bucket_id = 'payment-slips' and public.current_role() in ('owner', 'staff'))
with check (bucket_id = 'payment-slips' and public.current_role() in ('owner', 'staff'));

drop policy if exists "staff delete payment slips" on storage.objects;
create policy "staff delete payment slips"
on storage.objects for delete to authenticated
using (bucket_id = 'payment-slips' and public.current_role() in ('owner', 'staff'));