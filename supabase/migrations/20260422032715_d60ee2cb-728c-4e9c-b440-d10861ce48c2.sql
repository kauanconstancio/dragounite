
-- Fase 2: Opponents + scrims VOD
CREATE TABLE public.opponents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tag text,
  region text,
  notes text,
  recurring_picks text[] DEFAULT '{}',
  known_players jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.opponents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read opponents" ON public.opponents FOR SELECT USING (true);
CREATE POLICY "public write opponents" ON public.opponents FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.scrims
  ADD COLUMN opponent_id uuid REFERENCES public.opponents(id) ON DELETE SET NULL,
  ADD COLUMN vod_url text,
  ADD COLUMN vod_notes text;

-- Fase 3: Attendance + Announcements
CREATE TYPE public.attendance_status AS ENUM ('confirmed', 'declined', 'tentative');
CREATE TYPE public.event_type_kind AS ENUM ('training', 'scrim');

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  event_type public.event_type_kind NOT NULL,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL DEFAULT 'tentative',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, event_type, member_id)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read attendance" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "public write attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  author_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "public write announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);

-- Fase 4: Builds, Playbooks, Tier list
CREATE TABLE public.builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pokemon text NOT NULL,
  name text NOT NULL,
  items jsonb DEFAULT '[]'::jsonb,
  battle_item text,
  emblems text,
  moveset jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read builds" ON public.builds FOR SELECT USING (true);
CREATE POLICY "public write builds" ON public.builds FOR ALL USING (true) WITH CHECK (true);

CREATE TYPE public.playbook_category AS ENUM ('rotation', 'objective', 'lategame', 'earlygame', 'other');

CREATE TABLE public.playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category public.playbook_category NOT NULL DEFAULT 'other',
  map_data jsonb DEFAULT '{}'::jsonb,
  description text,
  linked_comp_id uuid REFERENCES public.compositions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read playbooks" ON public.playbooks FOR SELECT USING (true);
CREATE POLICY "public write playbooks" ON public.playbooks FOR ALL USING (true) WITH CHECK (true);

CREATE TYPE public.tier_rank AS ENUM ('S', 'A', 'B', 'C', 'D');

CREATE TABLE public.tier_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pokemon text NOT NULL,
  tier public.tier_rank NOT NULL DEFAULT 'B',
  lane public.lane_role,
  notes text,
  patch text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tier_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read tier_list" ON public.tier_list FOR SELECT USING (true);
CREATE POLICY "public write tier_list" ON public.tier_list FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.compositions
  ADD COLUMN linked_opponent_id uuid REFERENCES public.opponents(id) ON DELETE SET NULL;
