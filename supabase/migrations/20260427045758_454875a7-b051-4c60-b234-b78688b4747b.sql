
-- Staff role enum
CREATE TYPE public.staff_role AS ENUM ('owner','developer','finance','support','marketing');

-- Staff members table (internal company employees, separate from product customers)
CREATE TABLE public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.staff_role NOT NULL,
  full_name text,
  department text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE INDEX idx_staff_members_user_id ON public.staff_members(user_id);
CREATE INDEX idx_staff_members_active ON public.staff_members(active) WHERE active = true;

-- Helper: check if a user is staff (optionally with a specific role; owner satisfies any role check)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid, _role public.staff_role DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE user_id = _user_id
      AND active = true
      AND (_role IS NULL OR role = _role OR role = 'owner')
  )
$$;

-- Helper: get the highest staff role of a user (owner > others)
CREATE OR REPLACE FUNCTION public.staff_role_of(_user_id uuid)
RETURNS public.staff_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.staff_members
  WHERE user_id = _user_id AND active = true
  ORDER BY (role = 'owner') DESC, created_at ASC
  LIMIT 1
$$;

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff can read staff_members"
  ON public.staff_members FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "owners manage staff_members"
  ON public.staff_members FOR ALL
  USING (public.is_staff(auth.uid(), 'owner'))
  WITH CHECK (public.is_staff(auth.uid(), 'owner'));

CREATE TRIGGER trg_staff_members_updated_at
  BEFORE UPDATE ON public.staff_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log for sensitive staff actions
CREATE TABLE public.staff_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid NOT NULL,
  staff_role public.staff_role,
  action text NOT NULL,
  target_user_id uuid,
  target_team_id uuid,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_audit_staff_user ON public.staff_audit_log(staff_user_id);
CREATE INDEX idx_staff_audit_created_at ON public.staff_audit_log(created_at DESC);
CREATE INDEX idx_staff_audit_action ON public.staff_audit_log(action);

ALTER TABLE public.staff_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners read all audit"
  ON public.staff_audit_log FOR SELECT
  USING (public.is_staff(auth.uid(), 'owner'));

CREATE POLICY "staff read own audit"
  ON public.staff_audit_log FOR SELECT
  USING (auth.uid() = staff_user_id);

-- Inserts only via SECURITY DEFINER server functions; no direct insert policy.

-- Seed owner: link kauanconstancio13@gmail.com if the auth user exists
INSERT INTO public.staff_members (user_id, role, full_name, department)
SELECT id, 'owner'::public.staff_role, 'Kauan Constancio', 'Founder'
FROM auth.users
WHERE lower(email) = 'kauanconstancio13@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
