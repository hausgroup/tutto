-- Haus restaurant menu (generated from temp/menu_haus.csv)
-- Restaurant: 22222222-2222-4222-8222-222222222222
-- Does not DELETE products (order_items may reference them). Legacy rows are deactivated.

insert into public.product_categories (
  id, restaurant_id, name, sort_order, preparation_station, is_active
) values
  ('55555555-5555-4555-8555-555555557001', '22222222-2222-4222-8222-222222222222', 'Cocktails', 1, 'bar', true),
  ('55555555-5555-4555-8555-555555557002', '22222222-2222-4222-8222-222222222222', 'Entradas', 2, 'kitchen', true),
  ('55555555-5555-4555-8555-555555557003', '22222222-2222-4222-8222-222222222222', 'Platos fuertes', 3, 'kitchen', true),
  ('55555555-5555-4555-8555-555555557004', '22222222-2222-4222-8222-222222222222', 'Hamburguesas', 4, 'kitchen', true),
  ('55555555-5555-4555-8555-555555557005', '22222222-2222-4222-8222-222222222222', 'Menú infantil', 5, 'kitchen', true),
  ('55555555-5555-4555-8555-555555557006', '22222222-2222-4222-8222-222222222222', 'Bebidas', 6, 'bar', true),
  ('55555555-5555-4555-8555-555555557007', '22222222-2222-4222-8222-222222222222', 'Sodas', 7, 'bar', true),
  ('55555555-5555-4555-8555-555555557008', '22222222-2222-4222-8222-222222222222', 'Cervezas', 8, 'bar', true),
  ('55555555-5555-4555-8555-555555557009', '22222222-2222-4222-8222-222222222222', 'Postres', 9, 'dessert', true),
  ('55555555-5555-4555-8555-555555557010', '22222222-2222-4222-8222-222222222222', 'Vinos', 10, 'bar', true),
  ('55555555-5555-4555-8555-555555557011', '22222222-2222-4222-8222-222222222222', 'Sangrías', 11, 'bar', true)
on conflict (id) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  preparation_station = excluded.preparation_station,
  is_active = excluded.is_active;

update public.product_categories
set is_active = false
where restaurant_id = '22222222-2222-4222-8222-222222222222'
  and id not in ('55555555-5555-4555-8555-555555557001', '55555555-5555-4555-8555-555555557002', '55555555-5555-4555-8555-555555557003', '55555555-5555-4555-8555-555555557004', '55555555-5555-4555-8555-555555557005', '55555555-5555-4555-8555-555555557006', '55555555-5555-4555-8555-555555557007', '55555555-5555-4555-8555-555555557008', '55555555-5555-4555-8555-555555557009', '55555555-5555-4555-8555-555555557010', '55555555-5555-4555-8555-555555557011');

insert into public.products (
  id, restaurant_id, category_id, name, description, sku,
  price_minor, cost_minor, tax_rate_bps, preparation_station,
  track_inventory, is_active, allergens
) values
  ('66666666-6666-4666-8666-666613000001', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557001', 'Daikiri Corozo', 'Ron dorado, corozo y limón', 'HAUS-COCKTAILS-DAIKIRI-COROZO', 20000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000002', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557001', 'Manhattan Mompox', 'Whiskey, vino de corozo y vermouth rosso', 'HAUS-COCKTAILS-MANHATTAN-MOMP', 20000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000003', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557001', 'Ginger Gin', 'Gin, ginger ale, romero y limón', 'HAUS-COCKTAILS-GINGER-GIN', 20000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000004', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557001', 'Margarita Dark', 'Tequila, triple sec y almíbar de panela', 'HAUS-COCKTAILS-MARGARITA-DARK', 20000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000005', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557001', 'Mojito Cubano', 'Ron dorado, yerbabuena, soda y limón', 'HAUS-COCKTAILS-MOJITO-CUBANO', 20000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000006', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557001', 'Atardecer', 'Gin, Aperol y limón', 'HAUS-COCKTAILS-ATARDECER', 22000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000007', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557001', 'Moscow Mule', 'Vodka, ginger beer y limón', 'HAUS-COCKTAILS-MOSCOW-MULE', 21000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000008', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557001', 'Gin Tonic Jamaica', 'Gin, jamaica y agua tónica', 'HAUS-COCKTAILS-GIN-TONIC-JAMA', 20000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000009', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557001', 'Aperol Spritz', 'Prosecco y Aperol', 'HAUS-COCKTAILS-APEROL-SPRITZ', 22000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000010', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557001', 'Negroni', 'Gin, Aperol y vermut', 'HAUS-COCKTAILS-NEGRONI', 21000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000011', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557001', 'Sangría Sabanera', 'Vino de corozo, frutas y ginger ale', 'HAUS-COCKTAILS-SANGRIA-SABANE', 20000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000012', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557002', 'Langostinos Haus', 'Langostinos apanados con panko y coco, mayosiracha y salsa de anguila — Picante', 'HAUS-ENTRADAS-LANGOSTINOS-HAU', 23500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000013', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557002', 'Causa Sabanera', 'Ceviche de chicharrón, puré de plátano maduro, cabeza de gato y salsa agridulce — Picante', 'HAUS-ENTRADAS-CAUSA-SABANERA', 24500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000014', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557002', 'Papas Haus', 'Papas rústicas, salsa de queso cheddar, bacon ahumado y cebollín', 'HAUS-ENTRADAS-PAPAS-HAUS', 21500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000015', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557002', 'Croquetas Salmón', 'Croquetas cremosas de salmón, suero de cilantro y miel picante', 'HAUS-ENTRADAS-CROQUETAS-SALMO', 24000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000016', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557003', 'Pollo Saltado', 'Pechuga salteada con pimentón, cebolla, berenjena, zucchini, salsa teriyaki y puré de papa cremoso', 'HAUS-PLATOS-FUERTES-POLLO-SAL', 38500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000017', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557003', 'Ensalada Imperator', 'Pollo a la parrilla, mix de verdes, tomate cherry, parmesano, zucchini, bacon crutones, aceto balsámico y aceite de oliva', 'HAUS-PLATOS-FUERTES-ENSALADA-', 40500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000018', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557003', 'Ensalada Haus', 'Salmón salteado con pimentón, berenjena, zucchini, cebolla y salsa de anguila', 'HAUS-PLATOS-FUERTES-ENSALADA--2', 40500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000019', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557003', 'Pastas Haus', 'Rigatoni en salsa blanca, fondue de tomates cherry, albahaca, grana padano y pollo asado', 'HAUS-PLATOS-FUERTES-PASTAS-HA', 40500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000020', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557003', 'Costillas', 'Costillas de cerdo en salsa BBQ de whiskey, ensalada y papas rústicas', 'HAUS-PLATOS-FUERTES-COSTILLAS', 48500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000021', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557003', 'Salmón', 'Salmón a la parrilla con salsa de camarones, calamar y pulpo, puré de plátano y vegetales salteados', 'HAUS-PLATOS-FUERTES-SALMON', 53000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000022', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557003', 'Lomo', 'Lomo fino a la parrilla con reducción de vino, papas rústicas y ensalada', 'HAUS-PLATOS-FUERTES-LOMO', 52000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000023', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557003', 'Pollo Haus', 'Pechuga con queso gouda y espinaca, salsa de tres quesos, cebolla caramelizada y puré de papa', 'HAUS-PLATOS-FUERTES-POLLO-HAU', 44000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000024', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557003', 'Lomo Blue', 'Lomo fino a la parrilla en salsa de cuatro quesos, cebolla caramelizada y puré de papas', 'HAUS-PLATOS-FUERTES-LOMO-BLUE', 51500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000025', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557003', 'Lomo Tartufo', 'Lomo a la parrilla en salsa de parmigiano y trufa blanca, puré cremoso y salsa de corozo', 'HAUS-PLATOS-FUERTES-LOMO-TART', 53000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000026', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557003', 'Lomo Salteado', 'Lomo en tiras salteado con cebolla, pimentón, tomate y salsa de soya, puré cremoso de papas', 'HAUS-PLATOS-FUERTES-LOMO-SALT', 46000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000027', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557003', 'Pastas Rosse', 'Pastas cortas en salsa de tomate San Marzano y queso, con lomo salteado y parmesano', 'HAUS-PLATOS-FUERTES-PASTAS-RO', 47500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000028', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557003', 'Pastas Di Mare', 'Rigatoni en salsa de langostinos y crema, pulpo, camarón, calamar y mejillones, tomates cherry, ajo y perejil', 'HAUS-PLATOS-FUERTES-PASTAS-DI', 44000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000029', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557004', 'Clásica', 'Brioche, carne 160 g, queso emmental, cebolla grillé, tomate, lechuga y aderezo — Incluye papas rústicas', 'HAUS-HAMBURGUESAS-CLASICA', 30000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000030', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557004', 'Cheese Bacon', 'Brioche, carne 160 g, cheddar, salsa BBQ casera y bacon ahumado — Incluye papas rústicas', 'HAUS-HAMBURGUESAS-CHEESE-BACO', 31000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000031', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557004', 'Fondue', 'Brioche, carne 160 g, rúcula, fondue de quesos, mermelada de cebolla y portobellos — Incluye papas rústicas', 'HAUS-HAMBURGUESAS-FONDUE', 32000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000032', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557004', 'Sweet', 'Brioche, carne 160 g, gouda, rúcula, mostaza, mermelada de cebolla y bacon ahumado — Incluye papas rústicas', 'HAUS-HAMBURGUESAS-SWEET', 32000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000033', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557004', 'Mexa', 'Brioche, carne 160 g, emmental, guacamole, bacon, cebolla y ketchup picante — Incluye papas rústicas', 'HAUS-HAMBURGUESAS-MEXA', 30000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000034', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557004', 'Haus', 'Brioche, carne 160 g, queso azul, fondue, bacon, rúcula, mermelada de cebolla y mostaza — Incluye papas rústicas', 'HAUS-HAMBURGUESAS-HAUS', 32000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000035', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557004', 'Caribbean', 'Brioche, carne 160 g, tomate, queso costeño, cebolla grillé, bacon, alioli y BBQ — Incluye papas rústicas', 'HAUS-HAMBURGUESAS-CARIBBEAN', 32500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000036', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557004', 'Crunchy Ribs', 'Brioche, carne 160 g, mozzarella, costilla esmechada, lechuga, mostaza, aros de cebolla y BBQ — Incluye papas rústicas', 'HAUS-HAMBURGUESAS-CRUNCHY-RIB', 37000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000037', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557004', 'Doble Doble', 'Brioche, doble carne 100 g, doble cheddar, bacon, BBQ y mayonesa — Incluye papas rústicas', 'HAUS-HAMBURGUESAS-DOBLE-DOBLE', 35500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000038', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557004', 'El Patio', 'Brioche, carne 160 g, fondue, tomate, cebolla caramelizada, espinaca, bacon, BBQ y mostaza — Incluye papas rústicas', 'HAUS-HAMBURGUESAS-EL-PATIO', 34500, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000039', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557004', 'D''La Haus', 'Brioche, carne 160 g, bacon, doble cheddar, cebolla grillé y BBQ — Incluye papas rústicas', 'HAUS-HAMBURGUESAS-D-LA-HAUS', 32000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000040', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557004', 'Francesa', 'Brioche, carne 160 g, mostaza, stroganoff de portobellos y queso, cebolla caramelizada y aros de cebolla — Incluye papas rústicas', 'HAUS-HAMBURGUESAS-FRANCESA', 32000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000041', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557005', 'Hamburguesita', 'Pan brioche, carne 100 g, queso cheddar, cebolla crispy y BBQ', 'HAUS-MENU-INFANTIL-HAMBURGUES', 26000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000042', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557005', 'Nuggets', 'Pechuga de pollo apanada en panko con papas a la francesa', 'HAUS-MENU-INFANTIL-NUGGETS', 26000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000043', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557005', 'Pastas', 'Pastas cortas en salsa alfredo con pollo', 'HAUS-MENU-INFANTIL-PASTAS', 26000, 0, 800, 'kitchen', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000044', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557006', 'Té Hatsu', 'Té Hatsu', 'HAUS-BEBIDAS-TE-HATSU', 9000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000045', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557006', 'Gaseosas', 'Coca-Cola, ginger ale o soda', 'HAUS-BEBIDAS-GASEOSAS', 6000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000046', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557006', 'Agua', 'Agua 600 ml', 'HAUS-BEBIDAS-AGUA', 3000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000047', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557007', 'Sodas artesanales', 'Fresa, maracuyá, frutos rojos o corozo', 'HAUS-SODAS-SODAS-ARTESANALES', 12000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000048', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557008', 'Cervezas nacionales', 'Águila o Club Colombia', 'HAUS-CERVEZAS-CERVEZAS-NACION', 7000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000049', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557008', 'Cervezas importadas', 'Corona o Stella Artois', 'HAUS-CERVEZAS-CERVEZAS-IMPORT', 11000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000050', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557009', 'Cheese Cake', 'Frutos rojos', 'HAUS-POSTRES-CHEESE-CAKE', 18000, 0, 800, 'dessert', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000051', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557009', 'Brownie', 'Brownie artesanal con helado de vainilla', 'HAUS-POSTRES-BROWNIE', 17000, 0, 800, 'dessert', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000052', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557010', 'Las Moras Malbec (copa)', 'Malbec — Argentina', 'HAUS-VINOS-LAS-MORAS-MALBEC-C', 19000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000053', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557010', 'Marqués de León (copa)', 'Tempranillo — España', 'HAUS-VINOS-MARQUES-DE-LEON-CO', 15000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000054', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557010', 'Las Moras Sauvignon Blanc (copa)', 'Sauvignon Blanc — Argentina', 'HAUS-VINOS-LAS-MORAS-SAUVIGNO', 17000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000055', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557010', 'Las Moras Malbec (botella)', 'Malbec — Argentina', 'HAUS-VINOS-LAS-MORAS-MALBEC-B', 80000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000056', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557010', 'Marqués de León (botella)', 'Tempranillo — España', 'HAUS-VINOS-MARQUES-DE-LEON-BO', 50000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000057', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557010', 'Las Moras Sauvignon Blanc (botella)', 'Sauvignon Blanc — Argentina', 'HAUS-VINOS-LAS-MORAS-SAUVIGNO-2', 80000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000058', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557010', 'Marqués de Cáceres (botella)', 'Crianza — España', 'HAUS-VINOS-MARQUES-DE-CACERES', 130000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000059', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557010', 'Riunite Lambrusco (botella)', 'Lambrusco — Italia', 'HAUS-VINOS-RIUNITE-LAMBRUSCO-', 90000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000060', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557011', 'Sangría tinta (copa)', 'Vino tinto y frutas', 'HAUS-SANGRIAS-SANGRIA-TINTA-C', 18000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000061', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557011', 'Sangría blanca (copa)', 'Vino blanco y frutas', 'HAUS-SANGRIAS-SANGRIA-BLANCA-', 18000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000062', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557011', 'Sangría tinta (jarra)', 'Vino tinto y frutas', 'HAUS-SANGRIAS-SANGRIA-TINTA-J', 80000, 0, 800, 'bar', false, true, '{}'),
  ('66666666-6666-4666-8666-666613000063', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555557011', 'Sangría blanca (jarra)', 'Vino blanco y frutas', 'HAUS-SANGRIAS-SANGRIA-BLANCA--2', 80000, 0, 800, 'bar', false, true, '{}')
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
where restaurant_id = '22222222-2222-4222-8222-222222222222'
  and coalesce(sku, '') not like 'HAUS-%';
