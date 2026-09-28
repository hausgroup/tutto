-- Temporary tester feedback / issue log (remove when beta ends)

create type public.test_feedback_kind as enum ('issue', 'feedback', 'note');

create table public.test_feedback (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind public.test_feedback_kind not null default 'issue',
  title text not null,
  body text not null default '',
  page_path text,
  created_at timestamptz not null default now()
);

create index test_feedback_restaurant_created_idx
  on public.test_feedback (restaurant_id, created_at desc);

alter table public.test_feedback enable row level security;

create policy test_feedback_select on public.test_feedback
  for select
  using (public.is_restaurant_member (restaurant_id));

create policy test_feedback_insert on public.test_feedback
  for insert
  with check (
    public.is_restaurant_member (restaurant_id)
    and author_id = auth.uid ()
  );
