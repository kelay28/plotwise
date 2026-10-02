create table public.profiles (
  id uuid primary key,
  zone text not null default '7b',
  garden_name text not null default 'My Garden',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.beds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  kind text not null default 'raised',
  x int not null default 0, y int not null default 0,
  w int not null default 4, h int not null default 8,
  compact_x int not null default 0, compact_y int not null default 0,
  sun text not null default 'full',
  sun_hours numeric,
  soil_notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.beds to authenticated;
grant all on public.beds to service_role;
alter table public.beds enable row level security;
create policy "own beds" on public.beds for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.plant_varieties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  crop_slug text not null,
  name text not null,
  color text not null default '#2f855a',
  days_to_maturity int,
  description text,
  tips text,
  source text not null default 'ai',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.plant_varieties to authenticated;
grant all on public.plant_varieties to service_role;
alter table public.plant_varieties enable row level security;
create policy "own varieties" on public.plant_varieties for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.plantings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  bed_id uuid not null references public.beds(id) on delete cascade,
  cell_x int not null default 0, cell_y int not null default 0,
  crop_slug text not null,
  variety text,
  color text,
  planted_on date,
  method text not null default 'transplant',
  days_to_maturity int,
  status text not null default 'growing',
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.plantings to authenticated;
grant all on public.plantings to service_role;
alter table public.plantings enable row level security;
create policy "own plantings" on public.plantings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.pest_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  planting_id uuid references public.plantings(id) on delete set null,
  bed_id uuid references public.beds(id) on delete set null,
  pest text not null,
  treatment text,
  repeat_days int,
  observed_on date not null default current_date,
  last_treated_on date,
  resolved boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.pest_logs to authenticated;
grant all on public.pest_logs to service_role;
alter table public.pest_logs enable row level security;
create policy "own pests" on public.pest_logs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.bed_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  bed_id uuid not null references public.beds(id) on delete cascade,
  kind text not null default 'note',
  body text not null,
  noted_on date not null default current_date,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.bed_notes to authenticated;
grant all on public.bed_notes to service_role;
alter table public.bed_notes enable row level security;
create policy "own bed notes" on public.bed_notes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);