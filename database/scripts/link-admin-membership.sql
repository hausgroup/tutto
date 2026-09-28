-- Link an existing Supabase Auth user to the demo restaurant as admin.
-- Replace USER_ID with auth.users.id

insert into public.restaurant_memberships (restaurant_id, user_id, role_id)
select
  '22222222-2222-4222-8222-222222222222',
  'USER_ID'::uuid,
  id
from public.roles
where slug = 'admin'
on conflict (restaurant_id, user_id) do update
set role_id = excluded.role_id,
    is_active = true;
