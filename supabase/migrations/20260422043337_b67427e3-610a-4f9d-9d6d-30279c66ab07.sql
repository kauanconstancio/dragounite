-- ============= ROLES & PROFILES =============
CREATE TYPE public.app_role AS ENUM ('coach', 'player', 'viewer');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profiles policies
CREATE POLICY "profiles read all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "coaches manage profiles" ON public.profiles FOR ALL
  USING (public.has_role(auth.uid(), 'coach')) WITH CHECK (public.has_role(auth.uid(), 'coach'));

-- Roles policies
CREATE POLICY "roles read all" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "coaches manage roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'coach')) WITH CHECK (public.has_role(auth.uid(), 'coach'));

-- ============= TIGHTEN EXISTING TABLES =============
-- Helper: coach OR player check
-- Drop old permissive policies and recreate with role-based access

-- MEMBERS (coach only write)
DROP POLICY IF EXISTS "public write members" ON public.members;
CREATE POLICY "coaches write members" ON public.members FOR ALL
  USING (public.has_role(auth.uid(), 'coach')) WITH CHECK (public.has_role(auth.uid(), 'coach'));

-- OPPONENTS (coach only)
DROP POLICY IF EXISTS "public write opponents" ON public.opponents;
CREATE POLICY "coaches write opponents" ON public.opponents FOR ALL
  USING (public.has_role(auth.uid(), 'coach')) WITH CHECK (public.has_role(auth.uid(), 'coach'));

-- SCRIMS (coach only)
DROP POLICY IF EXISTS "public write scrims" ON public.scrims;
CREATE POLICY "coaches write scrims" ON public.scrims FOR ALL
  USING (public.has_role(auth.uid(), 'coach')) WITH CHECK (public.has_role(auth.uid(), 'coach'));

-- TRAININGS (coach only)
DROP POLICY IF EXISTS "public write trainings" ON public.trainings;
CREATE POLICY "coaches write trainings" ON public.trainings FOR ALL
  USING (public.has_role(auth.uid(), 'coach')) WITH CHECK (public.has_role(auth.uid(), 'coach'));

-- ANNOUNCEMENTS (coach only)
DROP POLICY IF EXISTS "public write announcements" ON public.announcements;
CREATE POLICY "coaches write announcements" ON public.announcements FOR ALL
  USING (public.has_role(auth.uid(), 'coach')) WITH CHECK (public.has_role(auth.uid(), 'coach'));

-- BUILDS (coach + player)
DROP POLICY IF EXISTS "public write builds" ON public.builds;
CREATE POLICY "team write builds" ON public.builds FOR ALL
  USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'player'))
  WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'player'));

-- COMPOSITIONS (coach + player)
DROP POLICY IF EXISTS "public write compositions" ON public.compositions;
CREATE POLICY "team write compositions" ON public.compositions FOR ALL
  USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'player'))
  WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'player'));

-- PLAYBOOKS (coach + player)
DROP POLICY IF EXISTS "public write playbooks" ON public.playbooks;
CREATE POLICY "team write playbooks" ON public.playbooks FOR ALL
  USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'player'))
  WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'player'));

-- TIER LIST (coach + player)
DROP POLICY IF EXISTS "public write tier_list" ON public.tier_list;
CREATE POLICY "team write tier_list" ON public.tier_list FOR ALL
  USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'player'))
  WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'player'));

-- ATTENDANCE (coach + player can write; players limited to themselves enforced at app level too)
DROP POLICY IF EXISTS "public write attendance" ON public.attendance;
CREATE POLICY "team write attendance" ON public.attendance FOR ALL
  USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'player'))
  WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'player'));

-- ============= MATCH PERFORMANCES (KDA) =============
CREATE TABLE public.match_performances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scrim_id UUID NOT NULL REFERENCES public.scrims(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL DEFAULT 1,
  pokemon TEXT,
  kills INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  damage_dealt INTEGER NOT NULL DEFAULT 0,
  damage_taken INTEGER NOT NULL DEFAULT 0,
  healing INTEGER NOT NULL DEFAULT 0,
  is_mvp BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scrim_id, member_id, game_number)
);
ALTER TABLE public.match_performances ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_perf_scrim ON public.match_performances(scrim_id);
CREATE INDEX idx_perf_member ON public.match_performances(member_id);

CREATE POLICY "perf read all" ON public.match_performances FOR SELECT USING (true);
CREATE POLICY "team write perf" ON public.match_performances FOR ALL
  USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'player'))
  WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'player'));