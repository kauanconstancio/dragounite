
-- =============================================================
-- 1. Enum para papel dentro da equipe
-- =============================================================
DO $$ BEGIN
  CREATE TYPE public.team_role AS ENUM ('coach', 'player', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================
-- 2. Tabela teams
-- =============================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#DC2626',
  accent_color text NOT NULL DEFAULT '#FBBF24',
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS teams_set_updated_at ON public.teams;
CREATE TRIGGER teams_set_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- 3. Tabela team_memberships
-- =============================================================
CREATE TABLE IF NOT EXISTS public.team_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_role public.team_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, team_id)
);

CREATE INDEX IF NOT EXISTS team_memberships_user_idx ON public.team_memberships(user_id);
CREATE INDEX IF NOT EXISTS team_memberships_team_idx ON public.team_memberships(team_id);

ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- 4. Funções helper SECURITY DEFINER
-- =============================================================
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE user_id = _user_id AND team_id = _team_id
  ) OR public.is_super_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.team_role_of(_user_id uuid, _team_id uuid)
RETURNS public.team_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_role FROM public.team_memberships
  WHERE user_id = _user_id AND team_id = _team_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_edit_team(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR public.team_role_of(_user_id, _team_id) IN ('coach','player')
$$;

CREATE OR REPLACE FUNCTION public.is_team_coach(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR public.team_role_of(_user_id, _team_id) = 'coach'
$$;

-- =============================================================
-- 5. RLS para teams e team_memberships
-- =============================================================
DROP POLICY IF EXISTS "teams readable by members or super admins" ON public.teams;
CREATE POLICY "teams readable by members or super admins" ON public.teams
  FOR SELECT USING (
    public.is_super_admin(auth.uid()) OR public.is_team_member(auth.uid(), id)
  );

DROP POLICY IF EXISTS "super admins manage teams" ON public.teams;
CREATE POLICY "super admins manage teams" ON public.teams
  FOR ALL USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "team coaches update own team" ON public.teams;
CREATE POLICY "team coaches update own team" ON public.teams
  FOR UPDATE USING (public.is_team_coach(auth.uid(), id))
  WITH CHECK (public.is_team_coach(auth.uid(), id));

DROP POLICY IF EXISTS "memberships readable by members or super" ON public.team_memberships;
CREATE POLICY "memberships readable by members or super" ON public.team_memberships
  FOR SELECT USING (
    public.is_super_admin(auth.uid())
    OR user_id = auth.uid()
    OR public.is_team_member(auth.uid(), team_id)
  );

DROP POLICY IF EXISTS "super admins manage memberships" ON public.team_memberships;
CREATE POLICY "super admins manage memberships" ON public.team_memberships
  FOR ALL USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "team coaches manage own team memberships" ON public.team_memberships;
CREATE POLICY "team coaches manage own team memberships" ON public.team_memberships
  FOR ALL USING (public.is_team_coach(auth.uid(), team_id))
  WITH CHECK (public.is_team_coach(auth.uid(), team_id));

-- =============================================================
-- 6. Adicionar team_id em todas as tabelas operacionais
-- =============================================================
ALTER TABLE public.members               ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.announcements         ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.scrims                ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.trainings             ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.builds                ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.compositions          ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.tier_list             ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.opponents             ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.playbooks             ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.attendance            ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.match_performances    ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.opponent_performances ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;

-- =============================================================
-- 7. Backfill: criar equipe inicial e popular team_id
-- =============================================================
DO $$
DECLARE
  v_team_id uuid;
  v_name text;
  v_desc text;
  v_logo text;
  v_primary text;
  v_accent text;
  v_first_coach uuid;
BEGIN
  SELECT team_name, description, logo_url, primary_color, accent_color
    INTO v_name, v_desc, v_logo, v_primary, v_accent
  FROM public.team_settings
  WHERE singleton = true
  LIMIT 1;

  IF v_name IS NULL THEN
    v_name := 'DragoUnite Y';
    v_primary := '#DC2626';
    v_accent := '#FBBF24';
  END IF;

  SELECT id INTO v_team_id FROM public.teams WHERE slug = 'dragounite-y' LIMIT 1;
  IF v_team_id IS NULL THEN
    INSERT INTO public.teams (slug, name, description, logo_url, primary_color, accent_color)
    VALUES ('dragounite-y', v_name, v_desc, v_logo, COALESCE(v_primary,'#DC2626'), COALESCE(v_accent,'#FBBF24'))
    RETURNING id INTO v_team_id;
  END IF;

  UPDATE public.members               SET team_id = v_team_id WHERE team_id IS NULL;
  UPDATE public.announcements         SET team_id = v_team_id WHERE team_id IS NULL;
  UPDATE public.scrims                SET team_id = v_team_id WHERE team_id IS NULL;
  UPDATE public.trainings             SET team_id = v_team_id WHERE team_id IS NULL;
  UPDATE public.builds                SET team_id = v_team_id WHERE team_id IS NULL;
  UPDATE public.compositions          SET team_id = v_team_id WHERE team_id IS NULL;
  UPDATE public.tier_list             SET team_id = v_team_id WHERE team_id IS NULL;
  UPDATE public.opponents             SET team_id = v_team_id WHERE team_id IS NULL;
  UPDATE public.playbooks             SET team_id = v_team_id WHERE team_id IS NULL;
  UPDATE public.attendance            SET team_id = v_team_id WHERE team_id IS NULL;
  UPDATE public.match_performances    SET team_id = v_team_id WHERE team_id IS NULL;
  UPDATE public.opponent_performances SET team_id = v_team_id WHERE team_id IS NULL;

  INSERT INTO public.team_memberships (user_id, team_id, team_role)
  SELECT DISTINCT ur.user_id,
         v_team_id,
         CASE
           WHEN ur.role = 'coach'  THEN 'coach'::public.team_role
           WHEN ur.role = 'player' THEN 'player'::public.team_role
           ELSE 'viewer'::public.team_role
         END
  FROM public.user_roles ur
  ON CONFLICT (user_id, team_id) DO NOTHING;

  SELECT user_id INTO v_first_coach
  FROM public.user_roles
  WHERE role = 'coach'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_first_coach IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_first_coach, 'super_admin')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- =============================================================
-- 8. NOT NULL + índices
-- =============================================================
ALTER TABLE public.members               ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.announcements         ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.scrims                ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.trainings             ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.builds                ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.compositions          ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.tier_list             ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.opponents             ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.playbooks             ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.attendance            ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.match_performances    ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.opponent_performances ALTER COLUMN team_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS members_team_idx               ON public.members(team_id);
CREATE INDEX IF NOT EXISTS announcements_team_idx         ON public.announcements(team_id);
CREATE INDEX IF NOT EXISTS scrims_team_idx                ON public.scrims(team_id);
CREATE INDEX IF NOT EXISTS trainings_team_idx             ON public.trainings(team_id);
CREATE INDEX IF NOT EXISTS builds_team_idx                ON public.builds(team_id);
CREATE INDEX IF NOT EXISTS compositions_team_idx          ON public.compositions(team_id);
CREATE INDEX IF NOT EXISTS tier_list_team_idx             ON public.tier_list(team_id);
CREATE INDEX IF NOT EXISTS opponents_team_idx             ON public.opponents(team_id);
CREATE INDEX IF NOT EXISTS playbooks_team_idx             ON public.playbooks(team_id);
CREATE INDEX IF NOT EXISTS attendance_team_idx            ON public.attendance(team_id);
CREATE INDEX IF NOT EXISTS match_performances_team_idx    ON public.match_performances(team_id);
CREATE INDEX IF NOT EXISTS opponent_performances_team_idx ON public.opponent_performances(team_id);

-- =============================================================
-- 9. Substituir RLS antigas pelas novas baseadas em team_id
-- =============================================================

-- members
DROP POLICY IF EXISTS "public read members"            ON public.members;
DROP POLICY IF EXISTS "coaches write members"          ON public.members;
DROP POLICY IF EXISTS "users update own linked member" ON public.members;
DROP POLICY IF EXISTS "members select by team"         ON public.members;
DROP POLICY IF EXISTS "members manage by team coach"   ON public.members;
DROP POLICY IF EXISTS "members update own linked"      ON public.members;

CREATE POLICY "members select by team" ON public.members
  FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "members manage by team coach" ON public.members
  FOR ALL USING (public.is_team_coach(auth.uid(), team_id))
  WITH CHECK (public.is_team_coach(auth.uid(), team_id));
CREATE POLICY "members update own linked" ON public.members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid() AND profiles.member_id = members.id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid() AND profiles.member_id = members.id)
  );

-- announcements
DROP POLICY IF EXISTS "public read announcements"          ON public.announcements;
DROP POLICY IF EXISTS "coaches write announcements"        ON public.announcements;
DROP POLICY IF EXISTS "announcements select by team"       ON public.announcements;
DROP POLICY IF EXISTS "announcements manage by team coach" ON public.announcements;

CREATE POLICY "announcements select by team" ON public.announcements
  FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "announcements manage by team coach" ON public.announcements
  FOR ALL USING (public.is_team_coach(auth.uid(), team_id))
  WITH CHECK (public.is_team_coach(auth.uid(), team_id));

-- scrims
DROP POLICY IF EXISTS "public read scrims"           ON public.scrims;
DROP POLICY IF EXISTS "coaches write scrims"         ON public.scrims;
DROP POLICY IF EXISTS "scrims select by team"        ON public.scrims;
DROP POLICY IF EXISTS "scrims manage by team coach"  ON public.scrims;

CREATE POLICY "scrims select by team" ON public.scrims
  FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "scrims manage by team coach" ON public.scrims
  FOR ALL USING (public.is_team_coach(auth.uid(), team_id))
  WITH CHECK (public.is_team_coach(auth.uid(), team_id));

-- trainings
DROP POLICY IF EXISTS "public read trainings"           ON public.trainings;
DROP POLICY IF EXISTS "coaches write trainings"         ON public.trainings;
DROP POLICY IF EXISTS "trainings select by team"        ON public.trainings;
DROP POLICY IF EXISTS "trainings manage by team coach"  ON public.trainings;

CREATE POLICY "trainings select by team" ON public.trainings
  FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "trainings manage by team coach" ON public.trainings
  FOR ALL USING (public.is_team_coach(auth.uid(), team_id))
  WITH CHECK (public.is_team_coach(auth.uid(), team_id));

-- builds
DROP POLICY IF EXISTS "public read builds"          ON public.builds;
DROP POLICY IF EXISTS "team write builds"           ON public.builds;
DROP POLICY IF EXISTS "builds select by team"       ON public.builds;
DROP POLICY IF EXISTS "builds manage by team edit"  ON public.builds;

CREATE POLICY "builds select by team" ON public.builds
  FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "builds manage by team edit" ON public.builds
  FOR ALL USING (public.can_edit_team(auth.uid(), team_id))
  WITH CHECK (public.can_edit_team(auth.uid(), team_id));

-- compositions
DROP POLICY IF EXISTS "public read compositions"          ON public.compositions;
DROP POLICY IF EXISTS "team write compositions"           ON public.compositions;
DROP POLICY IF EXISTS "compositions select by team"       ON public.compositions;
DROP POLICY IF EXISTS "compositions manage by team edit"  ON public.compositions;

CREATE POLICY "compositions select by team" ON public.compositions
  FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "compositions manage by team edit" ON public.compositions
  FOR ALL USING (public.can_edit_team(auth.uid(), team_id))
  WITH CHECK (public.can_edit_team(auth.uid(), team_id));

-- tier_list
DROP POLICY IF EXISTS "public read tier_list"          ON public.tier_list;
DROP POLICY IF EXISTS "team write tier_list"           ON public.tier_list;
DROP POLICY IF EXISTS "tier_list select by team"       ON public.tier_list;
DROP POLICY IF EXISTS "tier_list manage by team edit"  ON public.tier_list;

CREATE POLICY "tier_list select by team" ON public.tier_list
  FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "tier_list manage by team edit" ON public.tier_list
  FOR ALL USING (public.can_edit_team(auth.uid(), team_id))
  WITH CHECK (public.can_edit_team(auth.uid(), team_id));

-- opponents
DROP POLICY IF EXISTS "public read opponents"          ON public.opponents;
DROP POLICY IF EXISTS "coaches write opponents"        ON public.opponents;
DROP POLICY IF EXISTS "opponents select by team"       ON public.opponents;
DROP POLICY IF EXISTS "opponents manage by team coach" ON public.opponents;

CREATE POLICY "opponents select by team" ON public.opponents
  FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "opponents manage by team coach" ON public.opponents
  FOR ALL USING (public.is_team_coach(auth.uid(), team_id))
  WITH CHECK (public.is_team_coach(auth.uid(), team_id));

-- playbooks
DROP POLICY IF EXISTS "public read playbooks"          ON public.playbooks;
DROP POLICY IF EXISTS "team write playbooks"           ON public.playbooks;
DROP POLICY IF EXISTS "playbooks select by team"       ON public.playbooks;
DROP POLICY IF EXISTS "playbooks manage by team edit"  ON public.playbooks;

CREATE POLICY "playbooks select by team" ON public.playbooks
  FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "playbooks manage by team edit" ON public.playbooks
  FOR ALL USING (public.can_edit_team(auth.uid(), team_id))
  WITH CHECK (public.can_edit_team(auth.uid(), team_id));

-- attendance
DROP POLICY IF EXISTS "public read attendance"          ON public.attendance;
DROP POLICY IF EXISTS "team write attendance"           ON public.attendance;
DROP POLICY IF EXISTS "attendance select by team"       ON public.attendance;
DROP POLICY IF EXISTS "attendance manage by team edit"  ON public.attendance;

CREATE POLICY "attendance select by team" ON public.attendance
  FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "attendance manage by team edit" ON public.attendance
  FOR ALL USING (public.can_edit_team(auth.uid(), team_id))
  WITH CHECK (public.can_edit_team(auth.uid(), team_id));

-- match_performances
DROP POLICY IF EXISTS "perf read all"                    ON public.match_performances;
DROP POLICY IF EXISTS "team write perf"                  ON public.match_performances;
DROP POLICY IF EXISTS "match_perf select by team"        ON public.match_performances;
DROP POLICY IF EXISTS "match_perf manage by team edit"   ON public.match_performances;

CREATE POLICY "match_perf select by team" ON public.match_performances
  FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "match_perf manage by team edit" ON public.match_performances
  FOR ALL USING (public.can_edit_team(auth.uid(), team_id))
  WITH CHECK (public.can_edit_team(auth.uid(), team_id));

-- opponent_performances
DROP POLICY IF EXISTS "opp perf read all"              ON public.opponent_performances;
DROP POLICY IF EXISTS "team write opp perf"            ON public.opponent_performances;
DROP POLICY IF EXISTS "opp_perf select by team"        ON public.opponent_performances;
DROP POLICY IF EXISTS "opp_perf manage by team edit"   ON public.opponent_performances;

CREATE POLICY "opp_perf select by team" ON public.opponent_performances
  FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "opp_perf manage by team edit" ON public.opponent_performances
  FOR ALL USING (public.can_edit_team(auth.uid(), team_id))
  WITH CHECK (public.can_edit_team(auth.uid(), team_id));

-- =============================================================
-- 10. Storage policies para team-assets escopadas por equipe
-- =============================================================
DROP POLICY IF EXISTS "team-assets public read"        ON storage.objects;
DROP POLICY IF EXISTS "team-assets coaches upload"     ON storage.objects;
DROP POLICY IF EXISTS "team-assets coaches update"     ON storage.objects;
DROP POLICY IF EXISTS "team-assets coaches delete"     ON storage.objects;
DROP POLICY IF EXISTS "team-assets team upload"        ON storage.objects;
DROP POLICY IF EXISTS "team-assets team update"        ON storage.objects;
DROP POLICY IF EXISTS "team-assets team delete"        ON storage.objects;

CREATE POLICY "team-assets public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'team-assets');

CREATE POLICY "team-assets team upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'team-assets'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_team_coach(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

CREATE POLICY "team-assets team update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'team-assets'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_team_coach(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

CREATE POLICY "team-assets team delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'team-assets'
    AND (
      public.is_super_admin(auth.uid())
      OR public.is_team_coach(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );
