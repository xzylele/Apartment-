create table if not exists public.audit_logs (
  id bigint generated always as identity primary key, actor_id uuid references public.profiles(id),
  action text not null, entity text not null, entity_id text, old_data jsonb, new_data jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
drop policy if exists "owner reads audit logs" on public.audit_logs;
create policy "owner reads audit logs" on public.audit_logs for select to authenticated using (public.current_role() = 'owner');

create or replace function public.audit_changes() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_logs(actor_id,action,entity,entity_id,old_data) values(auth.uid(),'delete',tg_table_name,old.id::text,to_jsonb(old)); return old;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs(actor_id,action,entity,entity_id,old_data,new_data) values(auth.uid(),'update',tg_table_name,new.id::text,to_jsonb(old),to_jsonb(new)); return new;
  else
    insert into public.audit_logs(actor_id,action,entity,entity_id,new_data) values(auth.uid(),'insert',tg_table_name,new.id::text,to_jsonb(new)); return new;
  end if;
end;
$$;

drop trigger if exists audit_rooms on public.rooms;
drop trigger if exists audit_leases on public.leases;
drop trigger if exists audit_invoices on public.invoices;
drop trigger if exists audit_payments on public.payments;
drop trigger if exists audit_expenses on public.expenses;
drop trigger if exists audit_maintenance on public.maintenance_requests;
drop trigger if exists audit_announcements on public.announcements;
create trigger audit_rooms after insert or update or delete on public.rooms for each row execute function public.audit_changes();
create trigger audit_leases after insert or update or delete on public.leases for each row execute function public.audit_changes();
create trigger audit_invoices after insert or update or delete on public.invoices for each row execute function public.audit_changes();
create trigger audit_payments after insert or update or delete on public.payments for each row execute function public.audit_changes();
create trigger audit_expenses after insert or update or delete on public.expenses for each row execute function public.audit_changes();
create trigger audit_maintenance after insert or update or delete on public.maintenance_requests for each row execute function public.audit_changes();
create trigger audit_announcements after insert or update or delete on public.announcements for each row execute function public.audit_changes();
