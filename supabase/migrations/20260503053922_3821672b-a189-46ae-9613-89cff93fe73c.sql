ALTER TABLE public.match_performances
  ALTER COLUMN member_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS player_name text;

-- Drop antigo unique (scrim_id, member_id, game_number) para permitir múltiplos NULLs
ALTER TABLE public.match_performances
  DROP CONSTRAINT IF EXISTS match_performances_scrim_id_member_id_game_number_key;

-- Recria como índice único parcial só quando member_id está presente
CREATE UNIQUE INDEX IF NOT EXISTS match_performances_scrim_member_game_uniq
  ON public.match_performances (scrim_id, member_id, game_number)
  WHERE member_id IS NOT NULL;

-- Garante consistência: precisa ter pelo menos um identificador
ALTER TABLE public.match_performances
  DROP CONSTRAINT IF EXISTS match_performances_identity_chk;
ALTER TABLE public.match_performances
  ADD CONSTRAINT match_performances_identity_chk
  CHECK (member_id IS NOT NULL OR (player_name IS NOT NULL AND length(trim(player_name)) > 0));