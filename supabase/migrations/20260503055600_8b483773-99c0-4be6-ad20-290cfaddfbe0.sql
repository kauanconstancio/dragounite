DROP INDEX IF EXISTS public.match_performances_scrim_member_game_uniq;
ALTER TABLE public.match_performances
  ADD CONSTRAINT match_performances_scrim_member_game_uniq
  UNIQUE (scrim_id, member_id, game_number);