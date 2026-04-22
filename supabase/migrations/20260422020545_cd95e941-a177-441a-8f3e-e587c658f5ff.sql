
-- Enums
CREATE TYPE public.member_role AS ENUM ('player', 'substitute', 'coach', 'manager');
CREATE TYPE public.lane_role AS ENUM ('top', 'jungle', 'mid', 'bot', 'support', 'flex');
CREATE TYPE public.event_status AS ENUM ('scheduled', 'completed', 'cancelled');
CREATE TYPE public.match_result AS ENUM ('pending', 'win', 'loss', 'draw');

-- Members (jogadores, reservas, coach, gerentes)
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ign TEXT,
  role public.member_role NOT NULL DEFAULT 'player',
  lane public.lane_role,
  main_pokemon TEXT,
  avatar_url TEXT,
  discord TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trainings (treinos)
CREATE TABLE public.trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 90,
  focus TEXT,
  notes TEXT,
  status public.event_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scrims (amistosos)
CREATE TABLE public.scrims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opponent TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  best_of INTEGER NOT NULL DEFAULT 3,
  result public.match_result NOT NULL DEFAULT 'pending',
  score_us INTEGER NOT NULL DEFAULT 0,
  score_them INTEGER NOT NULL DEFAULT 0,
  status public.event_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compositions (composições do time)
CREATE TABLE public.compositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  strategy TEXT,
  top_pokemon TEXT,
  jungle_pokemon TEXT,
  mid_pokemon TEXT,
  bot_pokemon TEXT,
  support_pokemon TEXT,
  tier TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: open access for now (team-internal tool, no auth required)
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compositions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read members" ON public.members FOR SELECT USING (true);
CREATE POLICY "public write members" ON public.members FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read trainings" ON public.trainings FOR SELECT USING (true);
CREATE POLICY "public write trainings" ON public.trainings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read scrims" ON public.scrims FOR SELECT USING (true);
CREATE POLICY "public write scrims" ON public.scrims FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read compositions" ON public.compositions FOR SELECT USING (true);
CREATE POLICY "public write compositions" ON public.compositions FOR ALL USING (true) WITH CHECK (true);
