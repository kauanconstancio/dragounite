-- 1) Add user_id to members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- One member per (user, team)
CREATE UNIQUE INDEX IF NOT EXISTS members_team_user_unique
  ON public.members(team_id, user_id)
  WHERE user_id IS NOT NULL;

-- 2) Backfill from existing profiles.member_id
UPDATE public.members m
SET user_id = p.user_id
FROM public.profiles p
WHERE p.member_id = m.id
  AND m.user_id IS NULL;

-- 3) Update accept_team_invite to set members.user_id
CREATE OR REPLACE FUNCTION public.accept_team_invite(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _invite public.team_invites%ROWTYPE;
  _user_id uuid := auth.uid();
  _member_id uuid;
  _display_name text;
  _existing_profile_member uuid;
  _existing_member_team uuid;
  _existing_team_member uuid;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _invite FROM public.team_invites WHERE token = _token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF _invite.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'revoked');
  END IF;
  IF _invite.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_accepted');
  END IF;
  IF _invite.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  INSERT INTO public.profiles (user_id)
  SELECT _user_id
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id);

  INSERT INTO public.team_memberships (user_id, team_id, team_role)
  VALUES (_user_id, _invite.team_id, _invite.team_role)
  ON CONFLICT (user_id, team_id) DO UPDATE
    SET team_role = EXCLUDED.team_role;

  SELECT COALESCE(
    NULLIF(trim(_invite.invitee_name), ''),
    (SELECT display_name FROM public.profiles WHERE user_id = _user_id),
    'Novo membro'
  ) INTO _display_name;

  SELECT member_id INTO _existing_profile_member
  FROM public.profiles WHERE user_id = _user_id;

  IF _existing_profile_member IS NOT NULL THEN
    SELECT team_id INTO _existing_member_team
    FROM public.members WHERE id = _existing_profile_member;
  END IF;

  -- Already-linked member in this team (via members.user_id)
  SELECT id INTO _existing_team_member
    FROM public.members
   WHERE team_id = _invite.team_id AND user_id = _user_id
   LIMIT 1;

  IF _invite.member_id IS NOT NULL THEN
    _member_id := _invite.member_id;
    UPDATE public.members
       SET role = _invite.member_role,
           user_id = _user_id,
           name = CASE
                    WHEN NULLIF(trim(_invite.invitee_name), '') IS NOT NULL
                      THEN trim(_invite.invitee_name)
                    ELSE name
                  END,
           archived = false
     WHERE id = _member_id;
  ELSIF _existing_team_member IS NOT NULL THEN
    _member_id := _existing_team_member;
    UPDATE public.members
       SET role = _invite.member_role,
           name = CASE
                    WHEN NULLIF(trim(_invite.invitee_name), '') IS NOT NULL
                      THEN trim(_invite.invitee_name)
                    ELSE name
                  END,
           archived = false
     WHERE id = _member_id;
  ELSIF _existing_profile_member IS NOT NULL
        AND _existing_member_team = _invite.team_id THEN
    _member_id := _existing_profile_member;
    UPDATE public.members
       SET role = _invite.member_role,
           user_id = _user_id,
           name = CASE
                    WHEN NULLIF(trim(_invite.invitee_name), '') IS NOT NULL
                      THEN trim(_invite.invitee_name)
                    ELSE name
                  END,
           archived = false
     WHERE id = _member_id;
  ELSE
    INSERT INTO public.members (team_id, name, role, user_id)
    VALUES (_invite.team_id, _display_name, _invite.member_role, _user_id)
    RETURNING id INTO _member_id;
  END IF;

  UPDATE public.profiles
     SET member_id = _member_id
   WHERE user_id = _user_id;

  UPDATE public.team_invites
     SET accepted_at = now(), accepted_by = _user_id
   WHERE id = _invite.id;

  RETURN jsonb_build_object(
    'ok', true,
    'team_id', _invite.team_id,
    'member_id', _member_id,
    'team_role', _invite.team_role,
    'member_role', _invite.member_role
  );
END;
$function$;