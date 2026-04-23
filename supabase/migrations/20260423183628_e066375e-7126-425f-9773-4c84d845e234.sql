-- Create team_settings table (singleton row)
CREATE TABLE public.team_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  team_name text NOT NULL DEFAULT 'Battle Arena',
  description text,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#7C3AED',
  accent_color text NOT NULL DEFAULT '#F59E0B',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_settings_singleton_chk CHECK (singleton = true)
);

ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read team settings"
  ON public.team_settings FOR SELECT
  USING (true);

CREATE POLICY "coaches manage team settings"
  ON public.team_settings FOR ALL
  USING (public.has_role(auth.uid(), 'coach'))
  WITH CHECK (public.has_role(auth.uid(), 'coach'));

CREATE TRIGGER trg_team_settings_updated_at
  BEFORE UPDATE ON public.team_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed singleton row
INSERT INTO public.team_settings (singleton, team_name, description)
VALUES (true, 'Battle Arena', 'Equipe competitiva de Pokémon Unite')
ON CONFLICT (singleton) DO NOTHING;

-- Storage bucket for team assets (logo)
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-assets', 'team-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Team assets are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'team-assets');

CREATE POLICY "Coaches can upload team assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'team-assets' AND public.has_role(auth.uid(), 'coach'));

CREATE POLICY "Coaches can update team assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'team-assets' AND public.has_role(auth.uid(), 'coach'));

CREATE POLICY "Coaches can delete team assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'team-assets' AND public.has_role(auth.uid(), 'coach'));
