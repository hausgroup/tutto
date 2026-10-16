-- Hunter & Butcher menu (generated from temp/menu_hunter_butcher.csv)
-- Restaurant: 22222222-2222-4222-8222-222222222202
-- Source: public menu at hunter-and-butcher-menu.apeniche.chatgpt.site
-- Does not DELETE products (order_items may reference them). Legacy rows are deactivated.

insert into public.product_categories (
  id, restaurant_id, name, sort_order, preparation_station, is_active
) values
  ('55555555-5555-4555-8555-555555556001', '22222222-2222-4222-8222-222222222202', 'Cócteles', 1, 'bar', true),
  ('55555555-5555-4555-8555-555555556002', '22222222-2222-4222-8222-222222222202', 'Entradas', 2, 'kitchen', true),
  ('55555555-5555-4555-8555-555555556003', '22222222-2222-4222-8222-222222222202', 'Burgers parrilla', 3, 'kitchen', true),
  ('55555555-5555-4555-8555-555555556004', '22222222-2222-4222-8222-222222222202', 'Burgers sliders', 4, 'kitchen', true),
  ('55555555-5555-4555-8555-555555556005', '22222222-2222-4222-8222-222222222202', 'Sándwiches', 5, 'kitchen', true),
  ('55555555-5555-4555-8555-555555556006', '22222222-2222-4222-8222-222222222202', 'Desgranados', 6, 'kitchen', true),
  ('55555555-5555-4555-8555-555555556007', '22222222-2222-4222-8222-222222222202', 'Carnes', 7, 'kitchen', true),
  ('55555555-5555-4555-8555-555555556008', '22222222-2222-4222-8222-222222222202', 'Ensaladas', 8, 'kitchen', true),
  ('55555555-5555-4555-8555-555555556009', '22222222-2222-4222-8222-222222222202', 'Cervezas', 9, 'bar', true),
  ('55555555-5555-4555-8555-555555556010', '22222222-2222-4222-8222-222222222202', 'Bebidas', 10, 'bar', true)
on conflict (id) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  preparation_station = excluded.preparation_station,
  is_active = excluded.is_active;

update public.product_categories
set is_active = false
where restaurant_id = '22222222-2222-4222-8222-222222222202'
  and id not in ('55555555-5555-4555-8555-555555556001', '55555555-5555-4555-8555-555555556002', '55555555-5555-4555-8555-555555556003', '55555555-5555-4555-8555-555555556004', '55555555-5555-4555-8555-555555556005', '55555555-5555-4555-8555-555555556006', '55555555-5555-4555-8555-555555556007', '55555555-5555-4555-8555-555555556008', '55555555-5555-4555-8555-555555556009', '55555555-5555-4555-8555-555555556010');

insert into public.products (
  id, restaurant_id, category_id, name, description, sku,
  price_minor, cost_minor, tax_rate_bps, preparation_station,
  track_inventory, is_active, allergens
) values
  ('66666666-6666-4666-8666-666612000001', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556001', 'Cara de V', null, 'HNB-COCTELES-CARA-DE-V', 26000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000002', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556001', 'Cabeza de M', null, 'HNB-COCTELES-CABEZA-DE-M', 26000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000003', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556001', 'Mojito', 'Ron, soda y limón', 'HNB-COCTELES-MOJITO', 20000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000004', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556001', 'Caipi', 'Cachaça y limón', 'HNB-COCTELES-CAIPI', 17000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000005', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556001', 'Gin & Tonic', 'Gin, agua tónica y jamaica', 'HNB-COCTELES-GIN-TONIC', 18000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000006', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556001', 'Cuba Libre', 'Ron y Coca-Cola', 'HNB-COCTELES-CUBA-LIBRE', 15000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000007', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556001', 'Moscow Mule', 'Vodka y ginger', 'HNB-COCTELES-MOSCOW-MULE', 20000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000008', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556001', 'Smoke Spicy', 'Tequila y mezcal', 'HNB-COCTELES-SMOKE-SPICY', 21000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000009', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556001', 'Hunter Boom', 'Águila y Jäger', 'HNB-COCTELES-HUNTER-BOOM', 17000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000010', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556002', 'Chorizo', 'Chorizos asados a la parrilla, acompañados de cascos de papa y chimichurri', 'HNB-ENTRADAS-CHORIZO', 20000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000011', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556002', 'Bravas', 'Papa rústica, pulled pork, salsa brava, pico de gallo y queso fundido — Picante', 'HNB-ENTRADAS-BRAVAS', 28000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000012', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556002', 'Papa C.B', 'Papas rústicas, bacon ahumado y cheddar fundido', 'HNB-ENTRADAS-PAPA-C-B', 21500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000013', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556002', 'Aros de cebolla', null, 'HNB-ENTRADAS-AROS-DE-CEBOLLA', 12000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000014', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556003', 'Jäger', 'Ganadora del Burger Master 2026', 'HNB-BURGERS-PARRILLA-JAGER', 37500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000015', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556003', 'Korean Burger', 'Mayonesa de gochujang, pepper jack, tocineta y cebolla caramelizada', 'HNB-BURGERS-PARRILLA-KOREAN-', 34500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000016', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556003', 'Simply', 'Pan brioche, carne de 150 g, queso mozzarella, lechuga, tomate y aderezo Arrow', 'HNB-BURGERS-PARRILLA-SIMPLY', 30000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000017', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556003', 'Rigor', 'Pan brioche, carne de 150 g, queso cheddar, bacon, cebolla y salsa Rigor', 'HNB-BURGERS-PARRILLA-RIGOR', 31000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000018', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556003', 'Wild', 'Pan brioche, carne de 150 g, queso gouda, bacon, mermelada de cebolla, espinaca y mostaza', 'HNB-BURGERS-PARRILLA-WILD', 31000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000019', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556003', 'Hurt', 'Pan brioche, carne de 150 g, queso costeño, tomate, cebolla grillé, bacon y alioli', 'HNB-BURGERS-PARRILLA-HURT', 31500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000020', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556003', 'Blue', 'Pan brioche, carne de 150 g, queso azul, portobello, rúgula y mermelada de cebolla', 'HNB-BURGERS-PARRILLA-BLUE', 31000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000021', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556003', 'Ananas', 'Pan brioche, carne de 150 g, queso mozzarella, bacon, piña caramelizada y mostaza', 'HNB-BURGERS-PARRILLA-ANANAS', 31000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000022', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556003', 'Force', 'Pan brioche, carne de 150 g, queso fondue, tomate, bacon laqueado, mostaza, cebolla confitada y queso crema', 'HNB-BURGERS-PARRILLA-FORCE', 35000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000023', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556003', 'Smoke', 'Pan brioche, carne de 150 g, queso gouda, bacon, cebolla grillé, BBQ honey, mayonesa ahumada y cebolla crispy', 'HNB-BURGERS-PARRILLA-SMOKE', 35000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000024', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556003', 'Trap', 'Pan brioche, carne de 150 g, fondue de queso, bacon, aros de cebolla, espinaca, mermelada de cebolla, tomate y BBQ honey', 'HNB-BURGERS-PARRILLA-TRAP', 35000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000025', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556003', 'F*ck', 'Pan brioche, carne de 150 g, pulled pork, cebolla grillé, cheddar, alioli y BBQ honey', 'HNB-BURGERS-PARRILLA-F-CK', 36500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000026', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556003', 'God', 'Pan brioche, doble carne de 150 g, doble cheddar, doble bacon y BBQ honey', 'HNB-BURGERS-PARRILLA-GOD', 44500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000027', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556003', 'Dark', 'Pan brioche, carne de 150 g, mozzarella, chorizo casero, cebolla caramelizada, lechuga y dip de chimichurri', 'HNB-BURGERS-PARRILLA-DARK', 36000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000028', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556004', 'Big H&B', 'Pan mollete, carne de 100 g, queso mozzarella, lechuga, tomate, aderezo Arrow, pepinillos y cebolla', 'HNB-BURGERS-SLIDERS-BIG-H-B', 25000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000029', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556004', 'Crispy', 'Pan mollete, carne de 100 g, queso cheddar, BBQ H&B, cebolla crispy y bacon', 'HNB-BURGERS-SLIDERS-CRISPY', 25000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000030', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556004', 'Ring BBQ', 'Pan mollete, carne de 100 g, queso cheddar, BBQ H&B, aros de cebolla y mayonesa', 'HNB-BURGERS-SLIDERS-RING-BBQ', 25000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000031', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556004', 'Clásica', 'Pan mollete, carne de 100 g, queso cheddar, lechuga, tomate, cebolla, mayonesa, mostaza y ketchup', 'HNB-BURGERS-SLIDERS-CLASICA', 25000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000032', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556004', 'Shot', 'Pan mollete, carne de 100 g, queso cheddar, BBQ, alioli y cebolla grillé', 'HNB-BURGERS-SLIDERS-SHOT', 25000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000033', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556004', 'Odin', 'Pan mollete, doble carne de 100 g, doble cheddar, cebolla caramelizada, bacon, mostaza y BBQ honey', 'HNB-BURGERS-SLIDERS-ODIN', 35500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000034', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556005', 'American Street', 'Pan perro, salchicha polaca, cebolla picada, ketchup, mostaza, mayonesa y papa ripio', 'HNB-SANDWICHES-AMERICAN-STRE', 25000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000035', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556005', 'Costeño Street', 'Pan perro, salchicha polaca, ketchup, salsa de piña, tártara, papa ripio y queso costeño', 'HNB-SANDWICHES-COSTENO-STREE', 25000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000036', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556006', 'Hunter', 'Papa rústica, pollo grillé, fondue de quesos, maíz, piña sweet, lechuga, pulled pork y papa ripio', 'HNB-DESGRANADOS-HUNTER', 34500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000037', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556006', 'Butcher', 'Papa rústica, pollo grillé, fondue de quesos, maíz, piña sweet, lechuga, lomo a la parrilla y papa ripio', 'HNB-DESGRANADOS-BUTCHER', 37500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000038', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556006', 'Pump', 'Papa rústica, pollo grillé, fondue de quesos, maíz, piña sweet, lechuga, chilli con carne y papa ripio', 'HNB-DESGRANADOS-PUMP', 34000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000039', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556006', 'Salchipapa Hunter', 'Salchicha polaca, pechuga de pollo, papa ripio, lechuga, papas francesas, salsa tártara, salsa de piña artesanal y queso costeño rallado', 'HNB-DESGRANADOS-SALCHIPAPA-H', 31000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000040', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556007', 'Mignon', 'Lomo fino de res asado a la parrilla, acompañado con papas', 'HNB-CARNES-MIGNON', 50000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000041', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556008', 'Caesar', 'Mix de verdes, pollo a la parrilla, croutons, bacon, aderezo Arrow y parmesano', 'HNB-ENSALADAS-CAESAR', 36500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000042', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', 'Paulaner', 'Cerveza premium', 'HNB-CERVEZAS-PAULANER', 22000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000043', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', 'Vedett IPA', 'Cerveza premium', 'HNB-CERVEZAS-VEDETT-IPA', 22000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000044', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', 'Duvel', 'Cerveza premium', 'HNB-CERVEZAS-DUVEL', 22000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000045', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', 'Maredsous Triple', 'Cerveza premium', 'HNB-CERVEZAS-MAREDSOUS-TRIPL', 22000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000046', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', 'Liefmans', 'Cerveza premium', 'HNB-CERVEZAS-LIEFMANS', 20000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000047', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', 'Estrella Galicia', 'Cerveza premium', 'HNB-CERVEZAS-ESTRELLA-GALICI', 18000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000048', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', '1906', 'Cerveza premium (Precio regular: 16.000 COP)', 'HNB-CERVEZAS-1906', 13000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000049', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', 'Corona', 'Cerveza importada', 'HNB-CERVEZAS-CORONA', 11000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000050', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', 'Stella Artois', 'Cerveza importada', 'HNB-CERVEZAS-STELLA-ARTOIS', 11000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000051', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', 'Monte María', 'Cerveza artesanal', 'HNB-CERVEZAS-MONTE-MARIA', 12000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000052', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', 'BBC', 'Cerveza artesanal', 'HNB-CERVEZAS-BBC', 12000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000053', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', '3 Cordilleras', 'Cerveza artesanal', 'HNB-CERVEZAS-3-CORDILLERAS', 12000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000054', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', 'Riomar', 'Cerveza artesanal', 'HNB-CERVEZAS-RIOMAR', 12000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000055', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', 'Águila', 'Cerveza nacional', 'HNB-CERVEZAS-AGUILA', 7000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000056', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', 'Águila Light', 'Cerveza nacional', 'HNB-CERVEZAS-AGUILA-LIGHT', 7000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000057', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', 'Club Colombia Negra', 'Cerveza nacional', 'HNB-CERVEZAS-CLUB-COLOMBIA-N', 8000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000058', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556009', 'Club Colombia Dorada', 'Cerveza nacional', 'HNB-CERVEZAS-CLUB-COLOMBIA-D', 8000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000059', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556010', 'Gaseosas', 'Coca-Cola, Kola Román, Ginger Ale o Bretaña', 'HNB-BEBIDAS-GASEOSAS', 6000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000060', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556010', 'Té Hatsu', 'Blanco, negro, azul, rojo, verde, amarillo, lila o rosa', 'HNB-BEBIDAS-TE-HATSU', 9000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000061', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556010', 'Agua', null, 'HNB-BEBIDAS-AGUA', 3000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000062', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556010', 'Tequila (medida)', null, 'HNB-BEBIDAS-TEQUILA-MEDIDA', 16000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000063', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556010', 'Whiskey (medida)', null, 'HNB-BEBIDAS-WHISKEY-MEDIDA', 20000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000064', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556010', 'Ron (medida)', null, 'HNB-BEBIDAS-RON-MEDIDA', 18000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000065', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556010', 'Baileys (medida)', null, 'HNB-BEBIDAS-BAILEYS-MEDIDA', 15000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000066', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556010', 'Jack Daniel''s', 'Honey, Fire o Tennessee', 'HNB-BEBIDAS-JACK-DANIEL-S', 19000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000067', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556010', 'Monkey Brains', 'Shot: vodka, granadina y Baileys', 'HNB-BEBIDAS-MONKEY-BRAINS', 15000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000068', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556010', 'Cachetada', 'Shot: tequila, ron y vodka', 'HNB-BEBIDAS-CACHETADA', 16000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000069', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556010', 'Sodas artesanales', 'Fresa, corozo, frutos rojos o maracuyá', 'HNB-BEBIDAS-SODAS-ARTESANALE', 12000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000070', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556010', 'Vino tinto', 'Las Moras Malbec, vino de la casa', 'HNB-BEBIDAS-VINO-TINTO', 18000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000071', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556010', 'Vino blanco', 'Las Moras Sauvignon Blanc, vino de la casa', 'HNB-BEBIDAS-VINO-BLANCO', 18000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000072', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556010', 'Sangría', null, 'HNB-BEBIDAS-SANGRIA', 16000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666612000073', '22222222-2222-4222-8222-222222222202', '55555555-5555-4555-8555-555555556010', 'Tinto de verano', null, 'HNB-BEBIDAS-TINTO-DE-VERANO', 16000, 0, 800, 'bar', false, true, '{}')
on conflict (id) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  sku = excluded.sku,
  price_minor = excluded.price_minor,
  preparation_station = excluded.preparation_station,
  track_inventory = excluded.track_inventory,
  is_active = excluded.is_active;

update public.products
set is_active = false
where restaurant_id = '22222222-2222-4222-8222-222222222202'
  and coalesce(sku, '') not like 'HNB-%';
