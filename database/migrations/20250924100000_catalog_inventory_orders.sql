-- Phase 3–9: catalog extensions, inventory, orders, payments, cashier

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.inventory_movement_type as enum (
  'purchase',
  'sale_consumption',
  'waste',
  'adjustment',
  'transfer',
  'return',
  'stock_count'
);

create type public.order_status as enum (
  'open',
  'in_progress',
  'ready',
  'completed',
  'voided'
);

create type public.order_item_status as enum (
  'pending',
  'sent',
  'in_progress',
  'ready',
  'delivered',
  'cancelled'
);

create type public.payment_status as enum (
  'pending',
  'completed',
  'failed',
  'refunded'
);

create type public.cashier_session_status as enum (
  'open',
  'closed'
);

create type public.preparation_station as enum (
  'kitchen',
  'bar',
  'dessert',
  'other'
);

-- ---------------------------------------------------------------------------
-- Catalog extensions
-- ---------------------------------------------------------------------------

alter table public.products
  add column if not exists preparation_station public.preparation_station not null default 'kitchen';

create table public.product_modifiers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  price_minor_delta bigint not null default 0,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index product_modifiers_product_id_idx on public.product_modifiers (product_id);

-- ---------------------------------------------------------------------------
-- Recipes & ingredients
-- ---------------------------------------------------------------------------

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  unit text not null default 'g',
  stock_quantity numeric(14, 3) not null default 0 check (stock_quantity >= 0),
  min_stock_quantity numeric(14, 3) not null default 0,
  cost_minor_per_unit bigint not null default 0 check (cost_minor_per_unit >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ingredients_restaurant_id_idx on public.ingredients (restaurant_id);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id)
);

create table public.recipe_lines (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  wastage_bps int not null default 0 check (wastage_bps >= 0),
  unique (recipe_id, ingredient_id)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  quantity_delta numeric(14, 3) not null,
  unit_cost_minor bigint not null default 0,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index inventory_movements_restaurant_id_idx on public.inventory_movements (restaurant_id);
create index inventory_movements_ingredient_id_idx on public.inventory_movements (ingredient_id);

-- ---------------------------------------------------------------------------
-- Orders & payments
-- ---------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_id uuid references public.restaurant_tables (id) on delete set null,
  order_number serial,
  status public.order_status not null default 'open',
  opened_by uuid references public.profiles (id) on delete set null,
  subtotal_minor bigint not null default 0 check (subtotal_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  total_minor bigint not null default 0 check (total_minor >= 0),
  notes text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_restaurant_id_idx on public.orders (restaurant_id);
create index orders_table_id_idx on public.orders (table_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_name text not null,
  quantity int not null check (quantity > 0),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  tax_rate_bps int not null default 0,
  line_subtotal_minor bigint not null default 0,
  line_tax_minor bigint not null default 0,
  line_total_minor bigint not null default 0,
  status public.order_item_status not null default 'pending',
  preparation_station public.preparation_station not null default 'kitchen',
  notes text,
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);

create table public.order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  modifier_name text not null,
  price_minor_delta bigint not null default 0
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete restrict,
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  method_code text not null,
  amount_minor bigint not null check (amount_minor > 0),
  status public.payment_status not null default 'completed',
  processed_by uuid references public.profiles (id) on delete set null,
  reference text,
  created_at timestamptz not null default now()
);

create index payments_order_id_idx on public.payments (order_id);

-- ---------------------------------------------------------------------------
-- Cashier sessions
-- ---------------------------------------------------------------------------

create table public.cashier_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  opened_by uuid not null references public.profiles (id) on delete restrict,
  closed_by uuid references public.profiles (id) on delete set null,
  status public.cashier_session_status not null default 'open',
  opening_cash_minor bigint not null default 0,
  expected_cash_minor bigint,
  actual_cash_minor bigint,
  cash_sales_minor bigint not null default 0,
  card_sales_minor bigint not null default 0,
  transfer_sales_minor bigint not null default 0,
  other_sales_minor bigint not null default 0,
  refunds_minor bigint not null default 0,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index cashier_sessions_restaurant_id_idx on public.cashier_sessions (restaurant_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger ingredients_set_updated_at before update on public.ingredients
for each row execute function public.set_updated_at();

create trigger recipes_set_updated_at before update on public.recipes
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.product_modifiers enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_lines enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_modifiers enable row level security;
alter table public.payments enable row level security;
alter table public.cashier_sessions enable row level security;

create policy product_modifiers_select on public.product_modifiers
  for select using (public.is_restaurant_member(restaurant_id));
create policy product_modifiers_manage on public.product_modifiers
  for all using (public.user_has_permission(restaurant_id, 'products.manage'))
  with check (public.user_has_permission(restaurant_id, 'products.manage'));

create policy ingredients_select on public.ingredients
  for select using (public.is_restaurant_member(restaurant_id));
create policy ingredients_manage on public.ingredients
  for all using (public.user_has_permission(restaurant_id, 'inventory.manage'))
  with check (public.user_has_permission(restaurant_id, 'inventory.manage'));

create policy recipes_select on public.recipes
  for select using (public.is_restaurant_member(restaurant_id));
create policy recipes_manage on public.recipes
  for all using (public.user_has_permission(restaurant_id, 'products.manage'))
  with check (public.user_has_permission(restaurant_id, 'products.manage'));

create policy recipe_lines_select on public.recipe_lines
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_lines.recipe_id
        and public.is_restaurant_member(r.restaurant_id)
    )
  );
create policy recipe_lines_manage on public.recipe_lines
  for all using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_lines.recipe_id
        and public.user_has_permission(r.restaurant_id, 'products.manage')
    )
  );

create policy inventory_movements_select on public.inventory_movements
  for select using (public.is_restaurant_member(restaurant_id));
create policy inventory_movements_insert on public.inventory_movements
  for insert with check (public.user_has_permission(restaurant_id, 'inventory.manage'));

create policy orders_select on public.orders
  for select using (public.is_restaurant_member(restaurant_id));
create policy orders_insert on public.orders
  for insert with check (
    public.user_has_permission(restaurant_id, 'orders.create')
    or public.user_has_permission(restaurant_id, 'orders.modify')
  );
create policy orders_update on public.orders
  for update using (
    public.user_has_permission(restaurant_id, 'orders.modify')
    or public.user_has_permission(restaurant_id, 'payments.process')
  );

create policy order_items_select on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and public.is_restaurant_member(o.restaurant_id)
    )
  );
create policy order_items_write on public.order_items
  for all using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (
          public.user_has_permission(o.restaurant_id, 'orders.modify')
          or public.user_has_permission(o.restaurant_id, 'orders.create')
        )
    )
  );

create policy payments_select on public.payments
  for select using (public.is_restaurant_member(restaurant_id));
create policy payments_insert on public.payments
  for insert with check (public.user_has_permission(restaurant_id, 'payments.process'));

create policy cashier_sessions_select on public.cashier_sessions
  for select using (public.is_restaurant_member(restaurant_id));
create policy cashier_sessions_manage on public.cashier_sessions
  for all using (public.user_has_permission(restaurant_id, 'cashier.manage'))
  with check (public.user_has_permission(restaurant_id, 'cashier.manage'));

-- Staff can update table status via orders (handled server-side); allow members to read/write orders with permissions above

create policy restaurant_tables_update_status on public.restaurant_tables
  for update using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));
