CREATE OR REPLACE FUNCTION public._test_accept_invite_flow()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $TEST$
DECLARE
  _team_id        uuid;
  _coach_id       uuid;
  _user1          uuid;
  _user2          uuid;
  _user3          uuid;
  _existing_mid   uuid;
  _target_mid     uuid;
  _prev_mid       uuid;
  _new_mid        uuid;
  _final_mid      uuid;
  _profile_mid    uuid;
  _saved_mid_u1   uuid;
  _saved_mid_u2   uuid;
  _saved_mid_u3   uuid;
  _invite_token   text;
  _result         jsonb;
  _member_role    member_role;
  _member_team    uuid;
  _membership_role team_role;
  _log            text := '';
BEGIN
  -- Apenas super admins podem rodar
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas super admins podem rodar testes';
  END IF;

  -- Pega 3 usuários reais e um time
  SELECT t.id INTO _team_id FROM teams t WHERE t.archived = false LIMIT 1;
  SELECT user_id INTO _coach_id FROM user_roles WHERE role = 'super_admin' LIMIT 1;

  SELECT array_agg(user_id) INTO STRICT _user1
  FROM (SELECT user_id FROM profiles ORDER BY created_at LIMIT 1) s;

  SELECT user_id INTO _user1 FROM profiles ORDER BY created_at OFFSET 0 LIMIT 1;
  SELECT user_id INTO _user2 FROM profiles ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT user_id INTO _user3 FROM profiles ORDER BY created_at OFFSET 2 LIMIT 1;

  -- Salva estados originais para restaurar ao final
  SELECT member_id INTO _saved_mid_u1 FROM profiles WHERE user_id = _user1;
  SELECT member_id INTO _saved_mid_u2 FROM profiles WHERE user_id = _user2;
  SELECT member_id INTO _saved_mid_u3 FROM profiles WHERE user_id = _user3;

  -- Tudo dentro de SAVEPOINT para reverter ao final
  BEGIN
    -- Limpa estado de teste
    UPDATE profiles SET member_id = NULL WHERE user_id IN (_user1,_user2,_user3);

    ----------------------------------------------------------------
    -- CENÁRIO 1: convite com member_id específico + role coach
    ----------------------------------------------------------------
    INSERT INTO members (team_id, name, role)
      VALUES (_team_id, '[TEST] Antigo', 'substitute')
      RETURNING id INTO _existing_mid;
    UPDATE profiles SET member_id = _existing_mid WHERE user_id = _user1;

    INSERT INTO members (team_id, name, role)
      VALUES (_team_id, '[TEST] Alvo', 'player')
      RETURNING id INTO _target_mid;

    INSERT INTO team_invites
      (team_id, invited_by, member_id, member_role, team_role, invitee_name, expires_at)
      VALUES (_team_id, _coach_id, _target_mid, 'coach', 'coach', 'Test1', now() + interval '1 day')
      RETURNING token INTO _invite_token;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', _user1::text, 'role', 'authenticated')::text, true);
    SELECT public.accept_team_invite(_invite_token) INTO _result;
    _log := _log || E'[1] resultado: ' || _result::text || E'\n';

    SELECT member_id INTO _profile_mid FROM profiles WHERE user_id = _user1;
    SELECT role, team_id INTO _member_role, _member_team FROM members WHERE id = _profile_mid;
    SELECT team_role INTO _membership_role
      FROM team_memberships WHERE user_id = _user1 AND team_id = _team_id;

    IF (_result->>'ok')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION '[1] FALHOU: ok=%', _result;
    END IF;
    IF _profile_mid <> _target_mid THEN
      RAISE EXCEPTION '[1] FALHOU: profile.member_id (%) != convite.member_id (%)', _profile_mid, _target_mid;
    END IF;
    IF _member_role <> 'coach' THEN
      RAISE EXCEPTION '[1] FALHOU: members.role (%) != coach', _member_role;
    END IF;
    IF _membership_role <> 'coach' THEN
      RAISE EXCEPTION '[1] FALHOU: team_memberships.team_role (%) != coach', _membership_role;
    END IF;
    _log := _log || E'✓ [1] OK: member_id e role idênticos ao convite (coach)\n';

    ----------------------------------------------------------------
    -- CENÁRIO 2: usuário sem membro + convite sem member_id
    ----------------------------------------------------------------
    INSERT INTO team_invites (team_id, invited_by, member_role, team_role, invitee_name, expires_at)
      VALUES (_team_id, _coach_id, 'manager', 'player', 'Novato', now() + interval '1 day')
      RETURNING token INTO _invite_token;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', _user2::text, 'role', 'authenticated')::text, true);
    SELECT public.accept_team_invite(_invite_token) INTO _result;
    _log := _log || E'[2] resultado: ' || _result::text || E'\n';

    SELECT member_id INTO _new_mid FROM profiles WHERE user_id = _user2;
    SELECT role INTO _member_role FROM members WHERE id = _new_mid;

    IF (_result->>'ok')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION '[2] FALHOU: %', _result;
    END IF;
    IF _new_mid IS NULL THEN
      RAISE EXCEPTION '[2] FALHOU: novo membro não foi criado';
    END IF;
    IF _member_role <> 'manager' THEN
      RAISE EXCEPTION '[2] FALHOU: role (%) != manager', _member_role;
    END IF;
    _log := _log || E'✓ [2] OK: novo membro criado com role=manager\n';

    ----------------------------------------------------------------
    -- CENÁRIO 3: usuário com membro prévio no mesmo time, convite sem member_id
    ----------------------------------------------------------------
    INSERT INTO members (team_id, name, role)
      VALUES (_team_id, '[TEST] Reuso', 'substitute')
      RETURNING id INTO _prev_mid;
    UPDATE profiles SET member_id = _prev_mid WHERE user_id = _user3;

    INSERT INTO team_invites (team_id, invited_by, member_role, team_role, expires_at)
      VALUES (_team_id, _coach_id, 'player', 'player', now() + interval '1 day')
      RETURNING token INTO _invite_token;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', _user3::text, 'role', 'authenticated')::text, true);
    SELECT public.accept_team_invite(_invite_token) INTO _result;
    _log := _log || E'[3] resultado: ' || _result::text || E'\n';

    SELECT member_id INTO _final_mid FROM profiles WHERE user_id = _user3;
    SELECT role INTO _member_role FROM members WHERE id = _final_mid;

    IF (_result->>'ok')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION '[3] FALHOU: %', _result;
    END IF;
    IF _final_mid <> _prev_mid THEN
      RAISE EXCEPTION '[3] FALHOU: deveria reutilizar membro existente (% vs %)', _final_mid, _prev_mid;
    END IF;
    IF _member_role <> 'player' THEN
      RAISE EXCEPTION '[3] FALHOU: role (%) != player', _member_role;
    END IF;
    _log := _log || E'✓ [3] OK: membro reutilizado e role atualizada (substitute → player)\n';

    -- Força rollback do bloco (sucesso)
    RAISE EXCEPTION 'TEST_ROLLBACK_OK';

  EXCEPTION
    WHEN OTHERS THEN
      -- Restaura member_ids originais (caso tenham sido alterados antes do erro)
      -- Como estamos numa SECURITY DEFINER function sem savepoint real,
      -- precisamos limpar manualmente o que criamos:
      DELETE FROM team_invites WHERE invitee_name IN ('Test1','Novato') OR (invitee_name IS NULL AND created_at > now() - interval '1 minute' AND team_id = _team_id);
      DELETE FROM team_memberships WHERE user_id IN (_user1,_user2,_user3) AND team_id = _team_id AND created_at > now() - interval '1 minute';
      UPDATE profiles SET member_id = _saved_mid_u1 WHERE user_id = _user1;
      UPDATE profiles SET member_id = _saved_mid_u2 WHERE user_id = _user2;
      UPDATE profiles SET member_id = _saved_mid_u3 WHERE user_id = _user3;
      DELETE FROM members WHERE name LIKE '[TEST]%';

      IF SQLERRM = 'TEST_ROLLBACK_OK' THEN
        RETURN _log || E'\n════════════════════════════════════\n✅ TODOS OS 3 CENÁRIOS PASSARAM\n════════════════════════════════════';
      ELSE
        RETURN _log || E'\n❌ FALHOU: ' || SQLERRM;
      END IF;
  END;
END;
$TEST$;