alter table public.app_settings add column if not exists default_room_floor smallint not null default 1 check (default_room_floor between 1 and 4);
alter table public.app_settings add column if not exists default_room_type text not null default 'ห้องพัดลม' check (default_room_type in ('ห้องพัดลม','ห้องแอร์'));
