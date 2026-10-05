-- Historic sales imported from external tools (CSV/XML) for Reportes continuity.

create table public.historical_sales_imports (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  source_label text not null default 'import',
  original_filename text,
  file_format text not null check (file_format in ('csv', 'xml')),
  profile_id text not null,
  row_count int not null default 0 check (row_count >= 0),
  imported_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index historical_sales_imports_restaurant_idx
  on public.historical_sales_imports (restaurant_id, created_at desc);

create table public.historical_sales (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  import_id uuid references public.historical_sales_imports (id) on delete cascade,
  source_key text not null,
  closed_at timestamptz not null,
  order_number int,
  table_label text,
  payment_method text,
  subtotal_minor bigint not null default 0 check (subtotal_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (restaurant_id, source_key)
);

create index historical_sales_restaurant_closed_idx
  on public.historical_sales (restaurant_id, closed_at desc);

alter table public.historical_sales_imports enable row level security;
alter table public.historical_sales enable row level security;

create policy historical_sales_imports_select on public.historical_sales_imports
  for select
  using (public.is_restaurant_member (restaurant_id));

create policy historical_sales_imports_insert on public.historical_sales_imports
  for insert
  with check (
    public.is_restaurant_member (restaurant_id)
    and public.user_has_permission (restaurant_id, 'reports.view')
  );

create policy historical_sales_select on public.historical_sales
  for select
  using (public.is_restaurant_member (restaurant_id));

create policy historical_sales_insert on public.historical_sales
  for insert
  with check (
    public.is_restaurant_member (restaurant_id)
    and public.user_has_permission (restaurant_id, 'reports.view')
  );

create policy historical_sales_delete on public.historical_sales
  for delete
  using (
    public.is_restaurant_member (restaurant_id)
    and public.user_has_permission (restaurant_id, 'restaurant.settings.manage')
  );
