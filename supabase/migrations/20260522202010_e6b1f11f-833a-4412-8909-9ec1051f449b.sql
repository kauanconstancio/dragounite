
-- Table for ADM players (isolated from team roster)
CREATE TABLE public.adm_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  age integer,
  ign text,
  photo_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.adm_players ENABLE ROW LEVEL SECURITY;

-- Only the dedicated ADM email can do anything
CREATE POLICY "adm_players_owner_all"
  ON public.adm_players
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'kauanconstancio13@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'kauanconstancio13@gmail.com');

CREATE TRIGGER adm_players_set_updated_at
  BEFORE UPDATE ON public.adm_players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public bucket for player photos (readable by anyone, write restricted)
INSERT INTO storage.buckets (id, name, public)
VALUES ('adm-players', 'adm-players', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "adm_players_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'adm-players');

CREATE POLICY "adm_players_photos_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'adm-players'
    AND (auth.jwt() ->> 'email') = 'kauanconstancio13@gmail.com'
  );

CREATE POLICY "adm_players_photos_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'adm-players'
    AND (auth.jwt() ->> 'email') = 'kauanconstancio13@gmail.com'
  );

CREATE POLICY "adm_players_photos_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'adm-players'
    AND (auth.jwt() ->> 'email') = 'kauanconstancio13@gmail.com'
  );
