-- Add new columns to team_invites
ALTER TABLE public.team_invites
  ADD COLUMN IF NOT EXISTS member_role public.member_role NOT NULL DEFAULT 'player',
  ADD COLUMN IF NOT EXISTS invitee_name text;

-- Update accept_team_invite to auto-create roster member when none is linked
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

  -- Cria membership (se já existir, ignora)
  INSERT INTO public.team_memberships (user_id, team_id, team_role)
  VALUES (_user_id, _invite.team_id, _invite.team_role)
  ON CONFLICT DO NOTHING;

  -- Decide o member_id: usa o existente ou cria um novo no roster
  IF _invite.member_id IS NOT NULL THEN
    _member_id := _invite.member_id;
  ELSE
    -- Pega o nome do convite ou do profile
    SELECT COALESCE(
      NULLIF(trim(_invite.invitee_name), ''),
      (SELECT display_name FROM public.profiles WHERE user_id = _user_id),
      'Novo membro'
    ) INTO _display_name;

    INSERT INTO public.members (team_id, name, role)
    VALUES (_invite.team_id, _display_name, _invite.member_role)
    RETURNING id INTO _member_id;
  END IF;

  -- Vincula profile ao member
  UPDATE public.profiles SET member_id = _member_id WHERE user_id = _user_id;
  INSERT INTO public.profiles (user_id, member_id)
  SELECT _user_id, _member_id
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id);

  UPDATE public.team_invites
  SET accepted_at = now(), accepted_by = _user_id
  WHERE id = _invite.id;

  RETURN jsonb_build_object('ok', true, 'team_id', _invite.team_id, 'member_id', _member_id);
END;
$function$;