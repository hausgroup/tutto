-- Three operational restaurants under one business (Grupo Nazesch).

update public.restaurants
set
  name = 'Haus',
  slug = 'haus'
where id = '22222222-2222-4222-8222-222222222222';

insert into public.restaurants (
  id,
  business_id,
  name,
  slug,
  address_line1,
  city,
  phone
) values
  (
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111111',
    'Ciao',
    'ciao',
    null,
    'Bogotá',
    null
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    '11111111-1111-4111-8111-111111111111',
    'Hunter & Butcher',
    'hunter-butcher',
    null,
    'Bogotá',
    null
  )
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  business_id = excluded.business_id;

-- Default floor area per new location (edit layout in Plano de mesas).
insert into public.floor_areas (id, restaurant_id, name, sort_order) values
  (
    '33333333-3333-4333-8333-333333333311',
    '22222222-2222-4222-8222-222222222201',
    'Salón',
    1
  ),
  (
    '33333333-3333-4333-8333-333333333312',
    '22222222-2222-4222-8222-222222222202',
    'Salón',
    1
  )
on conflict (id) do nothing;

insert into public.payment_methods (restaurant_id, code, name, sort_order) values
  ('22222222-2222-4222-8222-222222222201', 'cash', 'Efectivo', 1),
  ('22222222-2222-4222-8222-222222222201', 'card', 'Tarjeta', 2),
  ('22222222-2222-4222-8222-222222222201', 'transfer', 'Transferencia', 3),
  ('22222222-2222-4222-8222-222222222202', 'cash', 'Efectivo', 1),
  ('22222222-2222-4222-8222-222222222202', 'card', 'Tarjeta', 2),
  ('22222222-2222-4222-8222-222222222202', 'transfer', 'Transferencia', 3)
on conflict (restaurant_id, code) do nothing;
