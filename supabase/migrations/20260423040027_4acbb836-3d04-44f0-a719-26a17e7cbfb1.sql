ALTER TABLE public.match_performances
ADD COLUMN IF NOT EXISTS result public.match_result NOT NULL DEFAULT 'pending';