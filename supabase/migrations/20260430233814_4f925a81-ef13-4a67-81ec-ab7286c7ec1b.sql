ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS recurrence_group_id uuid,
  ADD COLUMN IF NOT EXISTS recurrence_rule jsonb;

ALTER TABLE public.scrims
  ADD COLUMN IF NOT EXISTS recurrence_group_id uuid,
  ADD COLUMN IF NOT EXISTS recurrence_rule jsonb;

CREATE INDEX IF NOT EXISTS idx_trainings_recurrence_group ON public.trainings(recurrence_group_id);
CREATE INDEX IF NOT EXISTS idx_scrims_recurrence_group ON public.scrims(recurrence_group_id);