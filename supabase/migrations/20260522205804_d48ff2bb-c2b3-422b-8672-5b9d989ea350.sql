
-- 1. profiles: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "profiles read all" ON public.profiles;
CREATE POLICY "profiles read authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 2. user_roles: restrict SELECT to own row; restrict write to super_admin
DROP POLICY IF EXISTS "roles read all" ON public.user_roles;
CREATE POLICY "users read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "super admins read all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "coaches manage roles" ON public.user_roles;
CREATE POLICY "super admins insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "super admins update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "super admins delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 3. team_invites: drop blanket SELECT (token preview goes through server fn with service role)
DROP POLICY IF EXISTS "Anyone authenticated can lookup invite by token" ON public.team_invites;

-- 4. waitlist: drop public SELECT (server fn handles approval check with service role)
DROP POLICY IF EXISTS "public can check waitlist approval" ON public.waitlist;

-- 5. storage: remove duplicate unscoped coach policies for team-assets
DROP POLICY IF EXISTS "Coaches can upload team assets" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can update team assets" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete team assets" ON storage.objects;

-- 6. storage: restrict listing on public buckets to authenticated users
--    (public CDN URLs still work; this only affects list/select via the API)
DROP POLICY IF EXISTS "Team assets are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "team-assets public read" ON storage.objects;
CREATE POLICY "team-assets read authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'team-assets');

DROP POLICY IF EXISTS "adm_players_bucket_read" ON storage.objects;
CREATE POLICY "adm_players_bucket_read_admins"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'adm-players'
    AND public.is_adm_admin((auth.jwt() ->> 'email'))
  );

-- 7. Lock down SECURITY DEFINER helper functions from direct execution.
--    These are only meant to be called from inside RLS policies / triggers,
--    where they run with the function owner's privileges regardless of EXECUTE grants.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_team_coach(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_team(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.team_role_of(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.staff_role_of(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid, staff_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_adm_admin(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_adm_owner(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.adm_admins_protect_owner() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.ensure_member_for_membership() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_staff_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public._test_accept_invite_flow() FROM anon, authenticated, public;
-- accept_team_invite is intentionally callable via RPC — keep EXECUTE for authenticated
REVOKE EXECUTE ON FUNCTION public.accept_team_invite(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.accept_team_invite(text) TO authenticated;
