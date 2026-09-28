-- Staff module: membership management policies + invitations

create type public.staff_invitation_status as enum (
  'pending',
  'accepted',
  'cancelled'
);

create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role_id uuid not null references public.roles (id) on delete restrict,
  status public.staff_invitation_status not null default 'pending',
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, email)
);

create index staff_invitations_restaurant_id_idx on public.staff_invitations (restaurant_id);

create trigger staff_invitations_set_updated_at before update on public.staff_invitations
for each row execute function public.set_updated_at();

alter table public.staff_invitations enable row level security;

-- Managers can read profiles of members in restaurants they manage
create policy profiles_select_staff_manage on public.profiles
  for select using (
    exists (
      select 1
      from public.restaurant_memberships rm
      where rm.user_id = profiles.id
        and public.user_has_permission(rm.restaurant_id, 'staff.manage')
    )
  );

create policy memberships_insert_manage on public.restaurant_memberships
  for insert with check (public.user_has_permission(restaurant_id, 'staff.manage'));

create policy memberships_update_manage on public.restaurant_memberships
  for update using (public.user_has_permission(restaurant_id, 'staff.manage'))
  with check (public.user_has_permission(restaurant_id, 'staff.manage'));

create policy staff_invitations_select on public.staff_invitations
  for select using (public.user_has_permission(restaurant_id, 'staff.manage'));

create policy staff_invitations_insert on public.staff_invitations
  for insert with check (public.user_has_permission(restaurant_id, 'staff.manage'));

create policy staff_invitations_update on public.staff_invitations
  for update using (public.user_has_permission(restaurant_id, 'staff.manage'))
  with check (public.user_has_permission(restaurant_id, 'staff.manage'));
