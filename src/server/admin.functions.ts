import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const APP_ROLES = ["coach", "player", "viewer"] as const;
type AppRole = (typeof APP_ROLES)[number];
const TEAM_ROLES = ["coach", "player", "viewer"] as const;

async function assertManager(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r) => r.role as AppRole | "super_admin");
  if (!roles.includes("coach") && !roles.includes("super_admin")) {
    throw new Error("Apenas coaches/gerentes podem executar esta ação.");
  }
}

async function assertSuperAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r) => r.role as string);
  if (!roles.includes("super_admin")) {
    throw new Error("Apenas super-administradores podem executar esta ação.");
  }
}

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertManager(context.userId);

    const { data: usersList, error: uErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (uErr) throw new Error(uErr.message);

    const ids = usersList.users.map((u) => u.id);
    const [{ data: roles }, { data: profiles }, { data: memberships }, { data: teams }] =
      await Promise.all([
        supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
        supabaseAdmin.from("profiles").select("user_id, display_name, member_id").in("user_id", ids),
        supabaseAdmin.from("team_memberships").select("user_id, team_id, team_role").in("user_id", ids),
        supabaseAdmin.from("teams").select("id, name, slug, archived"),
      ]);

    const memberIds = (profiles ?? [])
      .map((p) => p.member_id)
      .filter((id): id is string => !!id);
    const { data: memberRows } = memberIds.length
      ? await supabaseAdmin
          .from("members")
          .select("id, role, lane")
          .in("id", memberIds)
      : { data: [] as { id: string; role: string; lane: string | null }[] };
    const memberMap = new Map<string, { role: string; lane: string | null }>();
    (memberRows ?? []).forEach((m) => memberMap.set(m.id, { role: m.role, lane: m.lane }));

    const teamMap = new Map<string, { id: string; name: string; slug: string; archived: boolean }>();
    (teams ?? []).forEach((t) => teamMap.set(t.id, t));

    return usersList.users.map((u) => {
      const profile = (profiles ?? []).find((p) => p.user_id === u.id) ?? null;
      const linked = profile?.member_id ? memberMap.get(profile.member_id) ?? null : null;
      return {
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as string),
      profile,
      member_role: linked?.role ?? null,
      member_lane: linked?.lane ?? null,
      teams: (memberships ?? [])
        .filter((m) => m.user_id === u.id)
        .map((m) => {
          const t = teamMap.get(m.team_id);
          return {
            team_id: m.team_id,
            team_role: m.team_role as string,
            name: t?.name ?? "—",
            slug: t?.slug ?? "",
            archived: t?.archived ?? false,
          };
        }),
      };
    });
  });

const LANES = ["top", "jungle", "mid", "bot", "support", "flex"] as const;
const MEMBER_ROLES = ["player", "substitute", "coach", "manager"] as const;

const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(72),
  display_name: z.string().trim().min(1).max(80),
  role: z.enum(APP_ROLES),
  member_role: z.enum(MEMBER_ROLES).default("player"),
  lane: z.enum(LANES).nullable().optional(),
  team_id: z.string().uuid(),
  team_role: z.enum(TEAM_ROLES).default("player"),
});

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createUserSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);

    // Verify the team exists
    const { data: team, error: tErr } = await supabaseAdmin
      .from("teams")
      .select("id")
      .eq("id", data.team_id)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!team) throw new Error("Equipe não encontrada.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.display_name },
    });
    if (error) throw new Error(error.message);
    const newId = created.user!.id;

    // Adjust app role if not viewer (trigger creates viewer + profile)
    if (data.role !== "viewer") {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
      await supabaseAdmin.from("user_roles").insert({ user_id: newId, role: data.role });
    }

    // Create roster member inside the chosen team
    const { data: newMember, error: mErr } = await supabaseAdmin
      .from("members")
      .insert({
        name: data.display_name,
        role: data.member_role,
        lane: data.lane ?? null,
        team_id: data.team_id,
      })
      .select("id")
      .single();
    if (mErr) throw new Error(mErr.message);

    // Link profile to the freshly created member
    await supabaseAdmin
      .from("profiles")
      .update({ member_id: newMember.id, display_name: data.display_name })
      .eq("user_id", newId);

    // Add the user as a member of the chosen team
    const { error: tmErr } = await supabaseAdmin
      .from("team_memberships")
      .insert({ user_id: newId, team_id: data.team_id, team_role: data.team_role });
    if (tmErr) throw new Error(tmErr.message);

    return { id: newId, member_id: newMember.id, team_id: data.team_id };
  });

const setRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(APP_ROLES),
});

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => setRoleSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertManager(context.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const linkSchema = z.object({
  user_id: z.string().uuid(),
  member_id: z.string().uuid().nullable(),
});

export const linkUserToMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => linkSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertManager(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ member_id: data.member_id })
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const setMemberRoleSchema = z.object({
  member_id: z.string().uuid(),
  role: z.enum(MEMBER_ROLES).optional(),
  lane: z.enum(LANES).nullable().optional(),
});

export const setMemberRoleAndLane = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => setMemberRoleSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertManager(context.userId);
    const patch: { role?: string; lane?: string | null } = {};
    if (data.role !== undefined) patch.role = data.role;
    if (data.lane !== undefined) patch.lane = data.lane;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin
      .from("members")
      .update(patch as never)
      .eq("id", data.member_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const deleteUserSchema = z.object({ user_id: z.string().uuid() });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteUserSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertManager(context.userId);
    if (data.user_id === context.userId) {
      throw new Error("Você não pode remover sua própria conta.");
    }

    // Find linked member to remove from roster as well
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("member_id")
      .eq("user_id", data.user_id)
      .maybeSingle();

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);

    if (prof?.member_id) {
      await supabaseAdmin.from("members").delete().eq("id", prof.member_id);
    }
    return { ok: true };
  });

const resetPwSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(6).max(72),
});

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resetPwSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertManager(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const deleteTeamSchema = z.object({
  team_id: z.string().uuid(),
  confirm_name: z.string().min(1).max(120),
});

export const deleteTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteTeamSchema.parse(input))
  .handler(async ({ context, data }) => {
    // Authorize: coach of this team OR super admin
    const { data: rolesRows } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isSuper = (rolesRows ?? []).some(
      (r) => (r.role as string) === "super_admin",
    );

    if (!isSuper) {
      const { data: membership } = await supabaseAdmin
        .from("team_memberships")
        .select("team_role")
        .eq("user_id", context.userId)
        .eq("team_id", data.team_id)
        .maybeSingle();
      if (!membership || membership.team_role !== "coach") {
        throw new Error("Apenas o coach desta equipe pode excluí-la.");
      }
    }

    const { data: team, error: tErr } = await supabaseAdmin
      .from("teams")
      .select("id, name")
      .eq("id", data.team_id)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!team) throw new Error("Equipe não encontrada.");

    if (
      team.name.trim().toLowerCase() !== data.confirm_name.trim().toLowerCase()
    ) {
      throw new Error(
        "Nome de confirmação não confere com o nome da equipe.",
      );
    }

    // Cascade delete all team-scoped data
    const tables = [
      "announcement_likes",
      "announcements",
      "attendance",
      "match_performances",
      "opponent_performances",
      "playbooks",
      "compositions",
      "opponents",
      "scrims",
      "trainings",
      "tier_list",
      "builds",
      "team_invites",
      "team_memberships",
    ] as const;

    // announcement_likes references announcements (team-scoped via that table)
    const { data: annIds } = await supabaseAdmin
      .from("announcements")
      .select("id")
      .eq("team_id", data.team_id);
    if (annIds && annIds.length > 0) {
      await supabaseAdmin
        .from("announcement_likes")
        .delete()
        .in(
          "announcement_id",
          annIds.map((a) => a.id),
        );
    }

    for (const t of tables) {
      if (t === "announcement_likes") continue; // already handled
      await supabaseAdmin.from(t as any).delete().eq("team_id", data.team_id);
    }

    // Unlink profiles pointing to members of this team
    const { data: memberIds } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("team_id", data.team_id);
    if (memberIds && memberIds.length > 0) {
      await supabaseAdmin
        .from("profiles")
        .update({ member_id: null })
        .in(
          "member_id",
          memberIds.map((m) => m.id),
        );
    }
    await supabaseAdmin.from("members").delete().eq("team_id", data.team_id);

    const { error: delErr } = await supabaseAdmin
      .from("teams")
      .delete()
      .eq("id", data.team_id);
    if (delErr) throw new Error(delErr.message);

    return { ok: true };
  });
