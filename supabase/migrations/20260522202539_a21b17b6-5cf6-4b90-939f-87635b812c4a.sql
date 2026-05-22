
ALTER TABLE public.adm_players
  ADD COLUMN IF NOT EXISTS game text,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
