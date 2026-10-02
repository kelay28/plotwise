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