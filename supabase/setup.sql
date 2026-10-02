-- Plotwise database setup: paste this whole file into Supabase > SQL Editor and click Run (once, on a new project).
-- Generated from supabase/migrations + drizzle/migrations, in order.

-- ── supabase/migrations/20261001200237_b8552480-937b-419e-af4a-dfc1b104caf5.sql
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

-- ── supabase/migrations/20261001202356_3b5c195a-f2df-42e5-9995-4543e1ad4c89.sql
ALTER TABLE public.plantings ADD COLUMN cell_w integer NOT NULL DEFAULT 1, ADD COLUMN cell_h integer NOT NULL DEFAULT 1;

-- ── supabase/migrations/20261001202641_9730c0ff-ef2e-48bb-a1e7-376afe7d4afa.sql
ALTER TABLE public.plantings ADD COLUMN icon text;

-- ── supabase/migrations/20261001202855_2d928bd8-074f-4157-b8aa-a6af1bd4bd93.sql
ALTER TABLE public.profiles ADD COLUMN yard_w integer, ADD COLUMN yard_h integer;

-- ── supabase/migrations/20261001204500_c0ecc95e-434c-4356-a989-041c25c3c1c0.sql
CREATE TABLE public.plant_pictures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  label text,
  data_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plant_pictures TO authenticated;
GRANT ALL ON public.plant_pictures TO service_role;
ALTER TABLE public.plant_pictures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pictures" ON public.plant_pictures FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── supabase/migrations/20261001205451_f8537c6e-8e91-4105-8b83-17fe5556a75a.sql
CREATE TABLE public.yard_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL DEFAULT 'path',
  label text,
  x integer NOT NULL DEFAULT 0,
  y integer NOT NULL DEFAULT 0,
  w integer NOT NULL DEFAULT 1,
  h integer NOT NULL DEFAULT 4,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.yard_features TO authenticated;
GRANT ALL ON public.yard_features TO service_role;
ALTER TABLE public.yard_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own features" ON public.yard_features FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── supabase/migrations/20261001212200_926bf9b1-f6e9-43ba-b22b-2d616a383fac.sql
ALTER TABLE public.plantings ADD COLUMN IF NOT EXISTS stage text;

-- ── supabase/migrations/20261001212337_15f15a77-cdec-4561-b652-b695706c9d14.sql
ALTER TABLE public.yard_features ADD COLUMN IF NOT EXISTS icon text;

-- ── supabase/migrations/20261001214721_ca627b7f-0a55-4f8e-aa17-e0aa07277420.sql
CREATE TABLE public.crop_icons (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  crop_slug text NOT NULL,
  icon text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, crop_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_icons TO authenticated;
GRANT ALL ON public.crop_icons TO service_role;
ALTER TABLE public.crop_icons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own crop icons" ON public.crop_icons FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── drizzle/migrations/0000_photos_and_plans.sql
CREATE TABLE public.garden_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  scope text NOT NULL DEFAULT 'garden',
  bed_id uuid REFERENCES public.beds(id) ON DELETE SET NULL,
  planting_id uuid REFERENCES public.plantings(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  caption text,
  taken_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.garden_photos TO authenticated;
GRANT ALL ON public.garden_photos TO service_role;
ALTER TABLE public.garden_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own photos" ON public.garden_photos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.planting_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  planned_on date NOT NULL,
  bed_id uuid REFERENCES public.beds(id) ON DELETE SET NULL,
  crop_slug text,
  title text,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planting_plans TO authenticated;
GRANT ALL ON public.planting_plans TO service_role;
ALTER TABLE public.planting_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans" ON public.planting_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own garden photos read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'garden-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own garden photos insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'garden-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own garden photos delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'garden-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── drizzle/migrations/0001_pest_photo.sql
ALTER TABLE public.pest_logs ADD COLUMN photo_id uuid REFERENCES public.garden_photos(id) ON DELETE SET NULL;

-- ── Private photo bucket (the access policies for it are created above).
insert into storage.buckets (id, name, public) values ('garden-photos', 'garden-photos', false)
on conflict (id) do nothing;
