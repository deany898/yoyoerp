-- 1. Public storage bucket for product/category images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Storage policies · public read, manager+admin write
drop policy if exists "product-images public read" on storage.objects;
create policy "product-images public read"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "product-images manager write" on storage.objects;
create policy "product-images manager write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and public.has_any_role(auth.uid(), array['admin'::app_role,'manager'::app_role])
  );

drop policy if exists "product-images manager update" on storage.objects;
create policy "product-images manager update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.has_any_role(auth.uid(), array['admin'::app_role,'manager'::app_role])
  );

drop policy if exists "product-images manager delete" on storage.objects;
create policy "product-images manager delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.has_any_role(auth.uid(), array['admin'::app_role,'manager'::app_role])
  );

-- 2. Categories cover image
alter table public.categories add column if not exists cover_image_url text;

-- 3. Team advances ledger
create table if not exists public.team_advances (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_at date not null default current_date,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_team_advances_worker on public.team_advances(worker_id);
create index if not exists idx_team_advances_paid_at on public.team_advances(paid_at desc);

alter table public.team_advances enable row level security;

drop policy if exists "staff read advances" on public.team_advances;
create policy "staff read advances" on public.team_advances
  for select to authenticated
  using (public.is_staff(auth.uid()));

drop policy if exists "manager write advances" on public.team_advances;
create policy "manager write advances" on public.team_advances
  for all to authenticated
  using (public.has_any_role(auth.uid(), array['admin'::app_role,'manager'::app_role]))
  with check (public.has_any_role(auth.uid(), array['admin'::app_role,'manager'::app_role]));