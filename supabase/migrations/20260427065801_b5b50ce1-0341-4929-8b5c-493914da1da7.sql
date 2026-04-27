
DROP POLICY IF EXISTS "Team coaches can create invites" ON public.team_invites;
DROP POLICY IF EXISTS "Team coaches can delete invites" ON public.team_invites;
DROP POLICY IF EXISTS "Team coaches can update invites" ON public.team_invites;
DROP POLICY IF EXISTS "Team coaches can view invites" ON public.team_invites;

CREATE POLICY "Team coaches can create invites"
ON public.team_invites FOR INSERT
TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND (public.can_edit_team(auth.uid(), team_id) OR public.is_super_admin(auth.uid()))
);

CREATE POLICY "Team coaches can view invites"
ON public.team_invites FOR SELECT
TO authenticated
USING (public.can_edit_team(auth.uid(), team_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Team coaches can update invites"
ON public.team_invites FOR UPDATE
TO authenticated
USING (public.can_edit_team(auth.uid(), team_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Team coaches can delete invites"
ON public.team_invites FOR DELETE
TO authenticated
USING (public.can_edit_team(auth.uid(), team_id) OR public.is_super_admin(auth.uid()));
