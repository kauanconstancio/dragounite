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

  -- Garante que o profile existe
  INSERT INTO public.profiles (user_id)
  SELECT _user_id
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id);

  -- Cria membership ou atualiza o cargo de acesso para o definido no convite
  INSERT INTO public.team_memberships (user_id, team_id, team_role)
  VALUES (_user_id, _invite.team_id, _invite.team_role)
  ON CONFLICT (user_id, team_id) DO UPDATE
    SET team_role = EXCLUDED.team_role;

  -- Nome a usar caso precise criar/atualizar membro
  SELECT COALESCE(
    NULLIF(trim(_invite.invitee_name), ''),
    (SELECT display_name FROM public.profiles WHERE user_id = _user_id),
    'Novo membro'
  ) INTO _display_name;

  -- Membro atualmente vinculado ao profile (pode ser de outra equipe)
  SELECT member_id INTO _existing_profile_member
  FROM public.profiles WHERE user_id = _user_id;

  IF _existing_profile_member IS NOT NULL THEN
    SELECT team_id INTO _existing_member_team
    FROM public.members WHERE id = _existing_profile_member;
  END IF;

  -- Decide o member_id final
  IF _invite.member_id IS NOT NULL THEN
    -- Convite já aponta para um membro específico do roster
    _member_id := _invite.member_id;
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
    -- Já existe um membro do mesmo time vinculado ao usuário: reutiliza
    _member_id := _existing_profile_member;
    UPDATE public.members
       SET role = _invite.member_role,
           name = CASE
                    WHEN NULLIF(trim(_invite.invitee_name), '') IS NOT NULL
                      THEN trim(_invite.invitee_name)
                    ELSE name
                  END,
           archived = false
     WHERE id = _member_id;
  ELSE
    -- Cria um novo membro no roster da equipe do convite
    INSERT INTO public.members (team_id, name, role)
    VALUES (_invite.team_id, _display_name, _invite.member_role)
    RETURNING id INTO _member_id;
  END IF;

  -- Vincula profile ao member final
  UPDATE public.profiles
     SET member_id = _member_id
   WHERE user_id = _user_id;

  -- Marca convite como aceito
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