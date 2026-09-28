-- Haus POS — initial schema (foundation)
-- Apply via Supabase SQL editor or `supabase db push` when using Supabase CLI.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.table_status as enum (
  'available',
  'occupied',
  'order_ready',
  'payment_pending',
  'reserved',
  'closed'
);

create type public.siigo_sync_status as enum (
  'pending',
  'syncing',
  'synced',
  'failed'
);

create type public.audit_action as enum (
  'create',
  'update',
  'delete',
  'void',
  'refund',
  'sync',
  'login',
  'logout',
  'other'
);

-- ---------------------------------------------------------------------------
-- Core tenancy
-- ---------------------------------------------------------------------------

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  tax_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict,
  name text not null,
  slug text not null,
  timezone text not null default 'America/Bogota',
  currency_code text not null default 'COP',
  address_line1 text,
  address_line2 text,
  city text,
  country text not null default 'CO',
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, slug)
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Authorization (extensible beyond admin/staff)
-- ---------------------------------------------------------------------------

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.restaurant_memberships (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create index restaurant_memberships_user_id_idx on public.restaurant_memberships (user_id);
create index restaurant_memberships_restaurant_id_idx on public.restaurant_memberships (restaurant_id);

-- ---------------------------------------------------------------------------
-- Floor / tables (Phase 2-ready)
-- ---------------------------------------------------------------------------

create table public.floor_areas (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  floor_area_id uuid not null references public.floor_areas (id) on delete cascade,
  label text not null,
  capacity int not null default 2 check (capacity > 0),
  status public.table_status not null default 'available',
  pos_x numeric(10, 2) not null default 0,
  pos_y numeric(10, 2) not null default 0,
  width numeric(10, 2) not null default 80,
  height numeric(10, 2) not null default 80,
  rotation_deg numeric(6, 2) not null default 0,
  shape text not null default 'rectangle',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, label)
);

create index restaurant_tables_restaurant_id_idx on public.restaurant_tables (restaurant_id);

-- ---------------------------------------------------------------------------
-- Catalog stubs (Phase 3-ready)
-- ---------------------------------------------------------------------------

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid references public.product_categories (id) on delete set null,
  name text not null,
  description text,
  sku text,
  price_minor bigint not null check (price_minor >= 0),
  cost_minor bigint not null default 0 check (cost_minor >= 0),
  tax_rate_bps int not null default 0 check (tax_rate_bps >= 0),
  is_active boolean not null default true,
  track_inventory boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_restaurant_id_idx on public.products (restaurant_id);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (restaurant_id, code)
);

-- ---------------------------------------------------------------------------
-- Integration & audit
-- ---------------------------------------------------------------------------

create table public.siigo_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  operation text not null,
  idempotency_key text not null,
  status public.siigo_sync_status not null default 'pending',
  attempts int not null default 0 check (attempts >= 0),
  last_error text,
  external_id text,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz,
  unique (idempotency_key)
);

create index siigo_sync_jobs_status_idx on public.siigo_sync_jobs (status);
create index siigo_sync_jobs_restaurant_id_idx on public.siigo_sync_jobs (restaurant_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  action public.audit_action not null default 'other',
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_restaurant_id_idx on public.audit_logs (restaurant_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_set_updated_at before update on public.businesses
for each row execute function public.set_updated_at();

create trigger restaurants_set_updated_at before update on public.restaurants
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger restaurant_memberships_set_updated_at before update on public.restaurant_memberships
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_restaurant_member(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurant_memberships rm
    where rm.restaurant_id = p_restaurant_id
      and rm.user_id = auth.uid()
      and rm.is_active = true
  );
$$;

create or replace function public.user_has_permission(
  p_restaurant_id uuid,
  p_permission_slug text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurant_memberships rm
    join public.role_permissions rp on rp.role_id = rm.role_id
    join public.permissions p on p.id = rp.permission_id
    where rm.restaurant_id = p_restaurant_id
      and rm.user_id = auth.uid()
      and rm.is_active = true
      and p.slug = p_permission_slug
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.businesses enable row level security;
alter table public.restaurants enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.restaurant_memberships enable row level security;
alter table public.floor_areas enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.payment_methods enable row level security;
alter table public.siigo_sync_jobs enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);

create policy businesses_select_member on public.businesses
  for select using (
    exists (
      select 1
      from public.restaurants r
      join public.restaurant_memberships rm on rm.restaurant_id = r.id
      where r.business_id = businesses.id
        and rm.user_id = auth.uid()
        and rm.is_active = true
    )
  );

create policy restaurants_select_member on public.restaurants
  for select using (public.is_restaurant_member(id));

create policy roles_select_authenticated on public.roles
  for select to authenticated using (true);

create policy permissions_select_authenticated on public.permissions
  for select to authenticated using (true);

create policy role_permissions_select_authenticated on public.role_permissions
  for select to authenticated using (true);

create policy memberships_select_own on public.restaurant_memberships
  for select using (user_id = auth.uid() or public.user_has_permission(restaurant_id, 'staff.manage'));

create policy floor_areas_select_member on public.floor_areas
  for select using (public.is_restaurant_member(restaurant_id));

create policy floor_areas_manage on public.floor_areas
  for all using (public.user_has_permission(restaurant_id, 'floor.manage'))
  with check (public.user_has_permission(restaurant_id, 'floor.manage'));

create policy restaurant_tables_select_member on public.restaurant_tables
  for select using (public.is_restaurant_member(restaurant_id));

create policy restaurant_tables_manage on public.restaurant_tables
  for all using (public.user_has_permission(restaurant_id, 'floor.manage'))
  with check (public.user_has_permission(restaurant_id, 'floor.manage'));

create policy product_categories_select_member on public.product_categories
  for select using (public.is_restaurant_member(restaurant_id));

create policy product_categories_manage on public.product_categories
  for all using (public.user_has_permission(restaurant_id, 'products.manage'))
  with check (public.user_has_permission(restaurant_id, 'products.manage'));

create policy products_select_member on public.products
  for select using (public.is_restaurant_member(restaurant_id));

create policy products_manage on public.products
  for all using (public.user_has_permission(restaurant_id, 'products.manage'))
  with check (public.user_has_permission(restaurant_id, 'products.manage'));

create policy payment_methods_select_member on public.payment_methods
  for select using (public.is_restaurant_member(restaurant_id));

create policy payment_methods_manage on public.payment_methods
  for all using (public.user_has_permission(restaurant_id, 'restaurant.settings.manage'))
  with check (public.user_has_permission(restaurant_id, 'restaurant.settings.manage'));

create policy siigo_sync_jobs_select_member on public.siigo_sync_jobs
  for select using (public.is_restaurant_member(restaurant_id));

create policy audit_logs_select_member on public.audit_logs
  for select using (
    restaurant_id is null
    or public.user_has_permission(restaurant_id, 'audit.view')
  );
