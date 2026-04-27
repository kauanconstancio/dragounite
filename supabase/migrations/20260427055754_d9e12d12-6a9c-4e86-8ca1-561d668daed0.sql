-- 1. Remove super_admin role from all users except staff@gymli.com
DELETE FROM public.user_roles
WHERE role = 'super_admin'
  AND user_id NOT IN (SELECT id FROM auth.users WHERE email = 'staff@gymli.com');

-- 2. Deactivate all existing staff_members except staff@gymli.com
DELETE FROM public.staff_members
WHERE user_id NOT IN (SELECT id FROM auth.users WHERE email = 'staff@gymli.com');

-- 3. If staff@gymli.com already exists, grant permissions immediately
DO $$
DECLARE
  staff_uid uuid;
BEGIN
  SELECT id INTO staff_uid FROM auth.users WHERE email = 'staff@gymli.com' LIMIT 1;
  IF staff_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (staff_uid, 'super_admin')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.staff_members (user_id, role, full_name, active)
    VALUES (staff_uid, 'owner', 'Staff Gymli', true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 4. Trigger function to auto-assign permissions when staff@gymli.com signs up
CREATE OR REPLACE FUNCTION public.handle_staff_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email = 'staff@gymli.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.staff_members (user_id, role, full_name, active)
    VALUES (NEW.id, 'owner', COALESCE(NEW.raw_user_meta_data->>'display_name', 'Staff Gymli'), true)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Attach trigger AFTER INSERT on auth.users (runs after handle_new_user)
DROP TRIGGER IF EXISTS on_auth_user_created_staff ON auth.users;
CREATE TRIGGER on_auth_user_created_staff
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_staff_user();

-- 6. Add unique constraints to make ON CONFLICT DO NOTHING work safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_members_user_id_role_key'
  ) THEN
    ALTER TABLE public.staff_members
      ADD CONSTRAINT staff_members_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;