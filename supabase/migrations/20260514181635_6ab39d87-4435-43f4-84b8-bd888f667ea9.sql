
CREATE TABLE public.team_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  championship_name text NOT NULL,
  placement text NOT NULL,
  year integer,
  achieved_at date,
  description text,
  link_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_titles select by team"
  ON public.team_titles FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "team_titles manage by team coach"
  ON public.team_titles FOR ALL
  USING (public.is_team_coach(auth.uid(), team_id))
  WITH CHECK (public.is_team_coach(auth.uid(), team_id));

CREATE TRIGGER team_titles_updated_at
  BEFORE UPDATE ON public.team_titles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX team_titles_team_id_idx ON public.team_titles(team_id);
