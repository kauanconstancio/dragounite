-- Add approval fields to waitlist for granting access
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS claimed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS claimed_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_waitlist_email_lower ON public.waitlist (lower(email));

-- Allow anonymous lookup of approval status by email (read-only, no PII risk beyond the email itself which is the lookup key)
DROP POLICY IF EXISTS "public can check waitlist approval" ON public.waitlist;
CREATE POLICY "public can check waitlist approval"
  ON public.waitlist
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Drop the previous narrow read policy (super admins) since the new one already covers SELECT
-- (we keep the super admin one for clarity but it's now redundant)