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