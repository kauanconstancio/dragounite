CREATE TABLE public.opponent_performances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scrim_id UUID NOT NULL REFERENCES public.scrims(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES public.opponents(id) ON DELETE SET NULL,
  game_number INTEGER NOT NULL DEFAULT 1,
  player_name TEXT NOT NULL,
  pokemon TEXT,
  kills INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  damage_dealt INTEGER NOT NULL DEFAULT 0,
  damage_taken INTEGER NOT NULL DEFAULT 0,
  healing INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(3,1),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_opp_perf_scrim ON public.opponent_performances(scrim_id);
CREATE INDEX idx_opp_perf_opponent ON public.opponent_performances(opponent_id);

ALTER TABLE public.opponent_performances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opp perf read all"
ON public.opponent_performances FOR SELECT
USING (true);

CREATE POLICY "team write opp perf"
ON public.opponent_performances FOR ALL
USING (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'player'::app_role))
WITH CHECK (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'player'::app_role));