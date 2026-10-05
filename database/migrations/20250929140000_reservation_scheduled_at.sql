-- When the reservation is expected (local restaurant time stored as timestamptz).

alter table public.restaurant_tables
  add column if not exists reservation_scheduled_at timestamptz;
