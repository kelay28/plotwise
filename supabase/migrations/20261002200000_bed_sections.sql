-- Blocked-off areas inside a bed (compost, being amended, path...) that plants can't be placed on.
CREATE TABLE public.bed_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  bed_id uuid NOT NULL REFERENCES public.beds(id) ON DELETE CASCADE,
  x integer NOT NULL,
  y integer NOT NULL,
  w integer NOT NULL DEFAULT 1,
  h integer NOT NULL DEFAULT 1,
  kind text NOT NULL DEFAULT 'other',
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bed_sections TO authenticated;
GRANT ALL ON public.bed_sections TO service_role;
ALTER TABLE public.bed_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bed sections" ON public.bed_sections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
