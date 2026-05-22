-- Table for ADM area allowed admins
CREATE TABLE IF NOT EXISTS public.adm_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  is_owner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.adm_admins ENABLE ROW LEVEL SECURITY;

-- Seed owner
INSERT INTO public.adm_admins (email, is_owner)
VALUES ('kauanconstancio13@gmail.com', true)
ON CONFLICT (email) DO UPDATE SET is_owner = true;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_adm_admin(_email text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.adm_admins WHERE lower(email) = lower(_email))
$$;

CREATE OR REPLACE FUNCTION public.is_adm_owner(_email text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.adm_admins WHERE lower(email) = lower(_email) AND is_owner = true)
$$;

-- Prevent deleting/demoting owner
CREATE OR REPLACE FUNCTION public.adm_admins_protect_owner()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.is_owner THEN
    RAISE EXCEPTION 'Não é possível remover o dono da Área dos ADM';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_owner AND NEW.is_owner = false THEN
    RAISE EXCEPTION 'Não é possível rebaixar o dono';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS adm_admins_protect_owner_trg ON public.adm_admins;
CREATE TRIGGER adm_admins_protect_owner_trg
BEFORE UPDATE OR DELETE ON public.adm_admins
FOR EACH ROW EXECUTE FUNCTION public.adm_admins_protect_owner();

-- RLS for adm_admins
DROP POLICY IF EXISTS adm_admins_select ON public.adm_admins;
CREATE POLICY adm_admins_select ON public.adm_admins
  FOR SELECT TO authenticated
  USING (public.is_adm_admin(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS adm_admins_owner_manage ON public.adm_admins;
CREATE POLICY adm_admins_owner_manage ON public.adm_admins
  FOR ALL TO authenticated
  USING (public.is_adm_owner(auth.jwt() ->> 'email'))
  WITH CHECK (public.is_adm_owner(auth.jwt() ->> 'email'));

-- Update adm_players policy to allow all admins
DROP POLICY IF EXISTS adm_players_owner_all ON public.adm_players;
CREATE POLICY adm_players_admins_all ON public.adm_players
  FOR ALL TO authenticated
  USING (public.is_adm_admin(auth.jwt() ->> 'email'))
  WITH CHECK (public.is_adm_admin(auth.jwt() ->> 'email'));

-- Update storage policies for adm-players bucket
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname LIKE 'adm_players_%'
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
  END LOOP;
END$$;

CREATE POLICY adm_players_bucket_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'adm-players');

CREATE POLICY adm_players_bucket_write ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'adm-players' AND public.is_adm_admin(auth.jwt() ->> 'email'))
  WITH CHECK (bucket_id = 'adm-players' AND public.is_adm_admin(auth.jwt() ->> 'email'));