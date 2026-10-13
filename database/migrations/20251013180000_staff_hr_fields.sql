-- HR fields for staff directory (per-restaurant area + hire date; profile contact & birthday)

alter table public.profiles
  add column if not exists birth_date date;

alter table public.restaurant_memberships
  add column if not exists work_area text,
  add column if not exists hired_at date;

comment on column public.restaurant_memberships.work_area is
  'salon | cocina | barra | caja | administracion | limpieza | otro';

create policy profiles_update_staff_manage on public.profiles
  for update using (
    exists (
      select 1
      from public.restaurant_memberships rm
      where rm.user_id = profiles.id
        and public.user_has_permission(rm.restaurant_id, 'staff.manage')
    )
  )
  with check (
    exists (
      select 1
      from public.restaurant_memberships rm
      where rm.user_id = profiles.id
        and public.user_has_permission(rm.restaurant_id, 'staff.manage')
    )
  );
