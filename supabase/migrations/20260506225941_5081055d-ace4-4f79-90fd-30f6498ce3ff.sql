
-- 1) Backfill: for every team_membership without a member in that team, create one
INSERT INTO public.members (team_id, user_id, name, role)
SELECT
  tm.team_id,
  tm.user_id,
  COALESCE(NULLIF(trim(p.display_name), ''), 'Novo membro') AS name,
  CASE tm.team_role
    WHEN 'coach'  THEN 'coach'::member_role
    WHEN 'player' THEN 'player'::member_role
    WHEN 'viewer' THEN 'substitute'::member_role
    ELSE 'player'::member_role
  END AS role
FROM public.team_memberships tm
LEFT JOIN public.profiles p ON p.user_id = tm.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.members m
  WHERE m.team_id = tm.team_id AND m.user_id = tm.user_id
);

-- Link profiles.member_id for users that don't have one yet (uses any one of their memberships)
UPDATE public.profiles p
SET member_id = m.id
FROM public.members m
WHERE p.member_id IS NULL
  AND m.user_id = p.user_id;

-- 2) Trigger: auto-create a member whenever a team_membership is inserted
CREATE OR REPLACE FUNCTION public.ensure_member_for_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _display_name text;
  _existing_member_id uuid;
BEGIN
  SELECT id INTO _existing_member_id
    FROM public.members
   WHERE team_id = NEW.team_id AND user_id = NEW.user_id
   LIMIT 1;

  IF _existing_member_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(trim(display_name), ''), 'Novo membro')
    INTO _display_name
    FROM public.profiles
   WHERE user_id = NEW.user_id;

  IF _display_name IS NULL THEN
    _display_name := 'Novo membro';
  END IF;

  INSERT INTO public.members (team_id, user_id, name, role)
  VALUES (
    NEW.team_id,
    NEW.user_id,
    _display_name,
    CASE NEW.team_role
      WHEN 'coach'  THEN 'coach'::member_role
      WHEN 'player' THEN 'player'::member_role
      WHEN 'viewer' THEN 'substitute'::member_role
      ELSE 'player'::member_role
    END
  )
  RETURNING id INTO _existing_member_id;

  -- Set profiles.member_id if missing
  UPDATE public.profiles
     SET member_id = _existing_member_id
   WHERE user_id = NEW.user_id AND member_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_member_for_membership ON public.team_memberships;
CREATE TRIGGER trg_ensure_member_for_membership
AFTER INSERT ON public.team_memberships
FOR EACH ROW
EXECUTE FUNCTION public.ensure_member_for_membership();
