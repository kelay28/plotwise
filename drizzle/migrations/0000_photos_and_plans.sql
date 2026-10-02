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