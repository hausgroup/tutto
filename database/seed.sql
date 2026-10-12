-- Development seed data for Haus POS
-- Run after migrations. Requires auth users to be created separately (see README).

insert into public.roles (slug, name, description, is_system) values
  ('admin', 'Administrador', 'Acceso completo al restaurante', true),
  ('staff', 'Personal', 'Operaciones de salón y POS', true)
on conflict (slug) do nothing;

insert into public.permissions (slug, name, description) values
  ('restaurant.settings.manage', 'Configuración del restaurante', 'Ajustes generales y métodos de pago'),
  ('staff.manage', 'Gestión de personal', 'Invitar y administrar staff'),
  ('floor.manage', 'Plano y mesas', 'Áreas, mesas y layout'),
  ('products.manage', 'Menú y productos', 'Categorías, productos y modificadores'),
  ('inventory.manage', 'Inventario', 'Ingredientes, movimientos y ajustes'),
  ('orders.create', 'Crear pedidos', 'Abrir mesas y agregar ítems'),
  ('orders.view', 'Ver pedidos', 'Consultar pedidos del restaurante'),
  ('orders.modify', 'Modificar pedidos', 'Cambiar ítems antes de cerrar'),
  ('orders.void', 'Anular pedidos', 'Anular pedidos con auditoría'),
  ('payments.process', 'Procesar pagos', 'Cobrar y registrar pagos'),
  ('cashier.manage', 'Caja', 'Apertura, cierre y arqueo'),
  ('reports.view', 'Reportes', 'Ver reportes operativos'),
  ('siigo.manage', 'Integración Siigo', 'Configurar y monitorear Siigo'),
  ('audit.view', 'Auditoría', 'Ver registros de auditoría')
on conflict (slug) do nothing;

-- Admin role: all permissions
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.slug = 'admin'
on conflict do nothing;

-- Staff role: operational permissions
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.slug in (
  'orders.create',
  'orders.view',
  'orders.modify',
  'payments.process'
)
where r.slug = 'staff'
on conflict do nothing;

insert into public.businesses (id, name, legal_name, tax_id)
values (
  '11111111-1111-4111-8111-111111111111',
  'Grupo Nazesch',
  'Grupo Nazesch SAS',
  '900123456-1'
)
on conflict (id) do nothing;

insert into public.restaurants (
  id,
  business_id,
  name,
  slug,
  address_line1,
  city,
  phone
) values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'Haus',
  'haus',
  'Calle 85 #12-34',
  'Bogotá',
  '+57 300 000 0000'
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug;

insert into public.restaurants (
  id,
  business_id,
  name,
  slug,
  city
) values
  (
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111111',
    'Ciao',
    'ciao',
    'Bogotá'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    '11111111-1111-4111-8111-111111111111',
    'Hunter & Butcher',
    'hunter-butcher',
    'Bogotá'
  )
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug;

-- Ciao: starter floor (replace via editor or move-operational-data-to-ciao.sql)
insert into public.floor_areas (id, restaurant_id, name, sort_order) values
  ('33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', 'Salón principal', 1),
  ('33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222201', 'Terraza', 2)
on conflict (id) do update set
  restaurant_id = excluded.restaurant_id,
  name = excluded.name;

insert into public.restaurant_tables (
  id, restaurant_id, floor_area_id, label, capacity, status, pos_x, pos_y, width, height
) values
  ('44444444-4444-4444-8444-444444444401', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333301', 'M1', 2, 'available', 40, 40, 72, 72),
  ('44444444-4444-4444-8444-444444444402', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333301', 'M2', 4, 'available', 140, 40, 96, 72),
  ('44444444-4444-4444-8444-444444444403', '22222222-2222-4222-8222-222222222201', '33333333-3333-4333-8333-333333333302', 'T1', 4, 'available', 40, 40, 96, 72)
on conflict (id) do update set
  restaurant_id = excluded.restaurant_id,
  floor_area_id = excluded.floor_area_id;

-- Full Ciao menu: run database/seed-menu-ciao.sql (or node scripts/import-menu-ciao.mjs)

insert into public.payment_methods (restaurant_id, code, name, sort_order) values
  ('22222222-2222-4222-8222-222222222222', 'cash', 'Efectivo', 1),
  ('22222222-2222-4222-8222-222222222222', 'card', 'Tarjeta', 2),
  ('22222222-2222-4222-8222-222222222222', 'transfer', 'Transferencia', 3)
on conflict (restaurant_id, code) do nothing;

-- Link owner/admin to all three restaurants (replace USER_ID):
-- insert into public.restaurant_memberships (restaurant_id, user_id, role_id, is_active)
-- select r.id, '<USER_ID>'::uuid, roles.id, true
-- from public.restaurants r
-- cross join public.roles roles
-- where roles.slug = 'admin'
--   and r.id in (
--     '22222222-2222-4222-8222-222222222222',
--     '22222222-2222-4222-8222-222222222201',
--     '22222222-2222-4222-8222-222222222202'
--   );
