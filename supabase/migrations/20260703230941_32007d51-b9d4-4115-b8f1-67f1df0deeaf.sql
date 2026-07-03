
-- 1. announcement_likes: restrict public read to team members via parent announcement
DROP POLICY IF EXISTS "public read announcement likes" ON public.announcement_likes;

CREATE POLICY "team members read announcement likes"
ON public.announcement_likes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = announcement_likes.announcement_id
      AND public.is_team_member(auth.uid(), a.team_id)
  )
);

-- 2. profiles: restrict authenticated SELECT to self, super_admin, or shared team membership
DROP POLICY IF EXISTS "profiles read authenticated" ON public.profiles;

CREATE POLICY "profiles read self or shared team"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_super_admin(auth.uid())
  OR public.is_staff(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.team_memberships tm_self
    JOIN public.team_memberships tm_other ON tm_self.team_id = tm_other.team_id
    WHERE tm_self.user_id = auth.uid()
      AND tm_other.user_id = profiles.user_id
  )
);

-- 3. team_settings (singleton branding row) can only be managed by super_admin
DROP POLICY IF EXISTS "coaches manage team settings" ON public.team_settings;

CREATE POLICY "super admin manages team settings"
ON public.team_settings
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- 4. team_settings: restrict SELECT to authenticated users (removes anon access)
DROP POLICY IF EXISTS "public read team settings" ON public.team_settings;

CREATE POLICY "authenticated read team settings"
ON public.team_settings
FOR SELECT
TO authenticated
USING (true);
