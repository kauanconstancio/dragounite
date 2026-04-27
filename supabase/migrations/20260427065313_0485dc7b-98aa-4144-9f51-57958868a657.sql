-- Tabela de convites
CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email text,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  team_role public.team_role NOT NULL DEFAULT 'player',
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_invites_token ON public.team_invites(token);
CREATE INDEX idx_team_invites_team ON public.team_invites(team_id);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Coaches/managers da equipe e super admins podem gerenciar convites da equipe
CREATE POLICY "Team coaches can view invites"
ON public.team_invites FOR SELECT TO authenticated
USING (public.can_edit_team(team_id, auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Team coaches can create invites"
ON public.team_invites FOR INSERT TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND (public.can_edit_team(team_id, auth.uid()) OR public.is_super_admin(auth.uid()))
);

CREATE POLICY "Team coaches can update invites"
ON public.team_invites FOR UPDATE TO authenticated
USING (public.can_edit_team(team_id, auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Team coaches can delete invites"
ON public.team_invites FOR DELETE TO authenticated
USING (public.can_edit_team(team_id, auth.uid()) OR public.is_super_admin(auth.uid()));

-- Qualquer autenticado pode buscar pelo token (para a página de aceite)
CREATE POLICY "Anyone authenticated can lookup invite by token"
ON public.team_invites FOR SELECT TO authenticated
USING (true);

-- Função para aceitar convite atomicamente
CREATE OR REPLACE FUNCTION public.accept_team_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite public.team_invites%ROWTYPE;
  _user_id uuid := auth.uid();
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

  -- Vincula profile ao member, se especificado
  IF _invite.member_id IS NOT NULL THEN
    UPDATE public.profiles SET member_id = _invite.member_id WHERE user_id = _user_id;
    -- Se não existir profile ainda, cria
    INSERT INTO public.profiles (user_id, member_id)
    SELECT _user_id, _invite.member_id
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id);
  END IF;

  UPDATE public.team_invites
  SET accepted_at = now(), accepted_by = _user_id
  WHERE id = _invite.id;

  RETURN jsonb_build_object('ok', true, 'team_id', _invite.team_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_team_invite(text) TO authenticated;