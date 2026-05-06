CREATE TYPE public.tryout_stage AS ENUM ('applied','contacted','tryout','evaluation','approved','rejected');

CREATE TABLE public.player_tryouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  name text NOT NULL,
  ign text,
  discord text,
  lane text,
  main_pokemon text,
  notes text,
  stage public.tryout_stage NOT NULL DEFAULT 'applied',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_tryouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tryouts select by team" ON public.player_tryouts
  FOR SELECT USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "tryouts manage by team coach" ON public.player_tryouts
  FOR ALL USING (public.is_team_coach(auth.uid(), team_id))
  WITH CHECK (public.is_team_coach(auth.uid(), team_id));

CREATE TRIGGER trg_player_tryouts_updated_at
  BEFORE UPDATE ON public.player_tryouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_player_tryouts_team_stage ON public.player_tryouts(team_id, stage, position);