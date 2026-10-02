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