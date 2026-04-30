-- =========================================================
-- Manufacturing Execution (MES-lite) for YOYO ERP
-- =========================================================

-- 1. Enums
create type public.mo_status as enum ('draft','released','in_progress','done','cancelled');
create type public.machine_status as enum ('idle','running','maintenance','offline');

-- 2. Stations (work centers)
create table public.stations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_stations_updated_at before update on public.stations
  for each row execute function public.update_updated_at_column();
alter table public.stations enable row level security;
create policy "staff read stations" on public.stations for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "manager write stations" on public.stations for all to authenticated
  using (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  with check (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- 3. Machines
create table public.machines (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  station_id uuid references public.stations(id) on delete set null,
  status public.machine_status not null default 'idle',
  hourly_rate numeric(12,2) not null default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_machines_station on public.machines(station_id);
create trigger trg_machines_updated_at before update on public.machines
  for each row execute function public.update_updated_at_column();
alter table public.machines enable row level security;
create policy "staff read machines" on public.machines for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "manager write machines" on public.machines for all to authenticated
  using (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  with check (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- 4. Moulds
create table public.moulds (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  cavity_count integer not null default 1,
  life_cycles integer not null default 0,
  used_cycles integer not null default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_moulds_updated_at before update on public.moulds
  for each row execute function public.update_updated_at_column();
alter table public.moulds enable row level security;
create policy "staff read moulds" on public.moulds for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "manager write moulds" on public.moulds for all to authenticated
  using (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  with check (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- 5. Workers (records only — no auth account)
create table public.workers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  station_id uuid references public.stations(id) on delete set null,
  job_role text,
  hourly_rate numeric(12,2) not null default 0,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_workers_station on public.workers(station_id);
create trigger trg_workers_updated_at before update on public.workers
  for each row execute function public.update_updated_at_column();
alter table public.workers enable row level security;
create policy "staff read workers" on public.workers for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "manager write workers" on public.workers for all to authenticated
  using (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  with check (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- 6. Manufacturing orders
create table public.manufacturing_orders (
  id uuid primary key default gen_random_uuid(),
  mo_number text not null unique,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  qty_planned numeric(14,3) not null,
  qty_produced numeric(14,3) not null default 0,
  qty_scrapped numeric(14,3) not null default 0,
  status public.mo_status not null default 'draft',
  source_do_id uuid references public.dispatch_orders(id) on delete set null,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  planned_start date,
  planned_end date,
  actual_start timestamptz,
  actual_end timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_mo_status on public.manufacturing_orders(status);
create index idx_mo_variant on public.manufacturing_orders(variant_id);
create index idx_mo_source_do on public.manufacturing_orders(source_do_id);
create trigger trg_mo_updated_at before update on public.manufacturing_orders
  for each row execute function public.update_updated_at_column();
alter table public.manufacturing_orders enable row level security;
create policy "staff read mo" on public.manufacturing_orders for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "ops write mo" on public.manufacturing_orders for all to authenticated
  using (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker']::app_role[]))
  with check (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker']::app_role[]));

-- 7. Stage runs
create table public.mo_stage_runs (
  id uuid primary key default gen_random_uuid(),
  mo_id uuid not null references public.manufacturing_orders(id) on delete cascade,
  stage_id uuid references public.production_stages(id) on delete set null,
  machine_id uuid references public.machines(id) on delete set null,
  mould_id uuid references public.moulds(id) on delete set null,
  worker_id uuid references public.workers(id) on delete set null,
  qty_in numeric(14,3) not null default 0,
  qty_out numeric(14,3) not null default 0,
  qty_scrap numeric(14,3) not null default 0,
  qty_rework numeric(14,3) not null default 0,
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_msr_mo on public.mo_stage_runs(mo_id);
alter table public.mo_stage_runs enable row level security;
create policy "staff read mo runs" on public.mo_stage_runs for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "ops write mo runs" on public.mo_stage_runs for all to authenticated
  using (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker']::app_role[]))
  with check (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker']::app_role[]));

-- 8. Material issues (component → WIP)
create table public.mo_material_issues (
  id uuid primary key default gen_random_uuid(),
  mo_id uuid not null references public.manufacturing_orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  qty numeric(14,3) not null,
  from_zone_id uuid references public.warehouse_zones(id) on delete set null,
  movement_id uuid references public.stock_movements(id) on delete set null,
  notes text,
  posted_at timestamptz not null default now(),
  posted_by uuid references auth.users(id) on delete set null
);
create index idx_mmi_mo on public.mo_material_issues(mo_id);
alter table public.mo_material_issues enable row level security;
create policy "staff read mo issues" on public.mo_material_issues for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "ops write mo issues" on public.mo_material_issues for all to authenticated
  using (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker']::app_role[]))
  with check (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker']::app_role[]));

-- 9. MO outputs (FG/SFG receipts)
create table public.mo_outputs (
  id uuid primary key default gen_random_uuid(),
  mo_id uuid not null references public.manufacturing_orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  qty numeric(14,3) not null,
  to_zone_id uuid references public.warehouse_zones(id) on delete set null,
  movement_id uuid references public.stock_movements(id) on delete set null,
  notes text,
  posted_at timestamptz not null default now(),
  posted_by uuid references auth.users(id) on delete set null
);
create index idx_mo_outputs_mo on public.mo_outputs(mo_id);
alter table public.mo_outputs enable row level security;
create policy "staff read mo outputs" on public.mo_outputs for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "ops write mo outputs" on public.mo_outputs for all to authenticated
  using (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker']::app_role[]))
  with check (public.has_any_role(auth.uid(), ARRAY['admin','manager','supervisor','worker']::app_role[]));

-- 10. Extend next_doc_number to allow MO + WO
create or replace function public.next_doc_number(_doc_type text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_seq   integer;
  v_date_part text;
begin
  if _doc_type not in ('DO','PO','MO','WO','GR') then
    raise exception 'Invalid doc_type %', _doc_type;
  end if;

  insert into public.doc_number_counters (doc_type, doc_date, last_seq)
  values (_doc_type, v_today, 1)
  on conflict (doc_type, doc_date)
  do update set last_seq = public.doc_number_counters.last_seq + 1
  returning last_seq into v_seq;

  v_date_part := to_char(v_today, 'DDMMYY');
  return _doc_type || v_date_part || '-' || lpad(v_seq::text, 3, '0');
end;
$$;