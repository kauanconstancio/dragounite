
-- Allow each user to update their own linked member row (Discord, IGN, main_pokemon, etc.)
CREATE POLICY "users update own linked member"
ON public.members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.member_id = members.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.member_id = members.id
  )
);
