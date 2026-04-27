import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/* -------------------------------------------------------------------------- */
/*  1. Check waitlist approval status (anonymous, by email)                   */
/* -------------------------------------------------------------------------- */

const checkSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});

export const checkWaitlistApproval = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => checkSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("waitlist")
      .select("id, email, approved, claimed_at, team_name")
      .ilike("email", data.email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { found: false as const };
    return {
      found: true as const,
      approved: row.approved,
      alreadyClaimed: !!row.claimed_at,
      suggestedTeamName: row.team_name ?? null,
    };
  });

/* -------------------------------------------------------------------------- */
/*  1b. Staff toggles waitlist approval                                        */
/* -------------------------------------------------------------------------- */

const setApprovalSchema = z.object({
  id: z.string().uuid(),
  approved: z.boolean(),
});

async function callerIsStaff(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("staff_members")
    .select("role")
    .eq("user_id", userId)
    .eq("active", true)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export const setWaitlistApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => setApprovalSchema.parse(input))
  .handler(async ({ context, data }) => {
    const ok = await callerIsStaff(context.userId);
    if (!ok) throw new Error("Acesso restrito a funcionários.");

    const { data: row, error: rErr } = await supabaseAdmin
      .from("waitlist")
      .select("id, claimed_at")
      .eq("id", data.id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!row) throw new Error("Inscrição não encontrada.");
    if (row.claimed_at) {
      throw new Error("Esta inscrição já criou conta — não é possível alterar.");
    }

    const { error: uErr } = await supabaseAdmin
      .from("waitlist")
      .update({
        approved: data.approved,
        approved_at: data.approved ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (uErr) throw new Error(uErr.message);

    await supabaseAdmin.from("staff_audit_log").insert({
      staff_user_id: context.userId,
      action: data.approved ? "waitlist.approve" : "waitlist.unapprove",
      payload: { waitlist_id: data.id } as never,
    } as never);

    return { ok: true };
  });

/* -------------------------------------------------------------------------- */
/*  2. Sign up an approved waitlist user                                       */
/* -------------------------------------------------------------------------- */

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(72),
  display_name: z.string().trim().min(1).max(80),
});

export const signupApprovedUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signupSchema.parse(input))
  .handler(async ({ data }) => {
    // 1. Confirm the email is on the waitlist AND approved
    const { data: wl, error: wlErr } = await supabaseAdmin
      .from("waitlist")
      .select("id, approved, claimed_at")
      .ilike("email", data.email)
      .maybeSingle();
    if (wlErr) throw new Error(wlErr.message);
    if (!wl) {
      throw new Error(
        "Este email não está na nossa lista de espera. Entre na waitlist primeiro.",
      );
    }
    if (!wl.approved) {
      throw new Error(
        "Seu acesso ainda não foi aprovado. Você receberá um email assim que for liberado.",
      );
    }
    if (wl.claimed_at) {
      throw new Error(
        "Este email já criou uma conta. Faça login normalmente.",
      );
    }

    // 2. Create the auth user (email already verified — they're approved)
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.display_name },
    });
    if (cErr) throw new Error(cErr.message);
    const newId = created.user!.id;

    // 3. Promote default 'viewer' role to 'coach' (this user owns their org)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newId, role: "coach" });

    // 4. Mark waitlist row as claimed
    await supabaseAdmin
      .from("waitlist")
      .update({ claimed_at: new Date().toISOString(), claimed_user_id: newId })
      .eq("id", wl.id);

    return { ok: true, user_id: newId };
  });

/* -------------------------------------------------------------------------- */
/*  3. Onboarding — create the user's first team                              */
/* -------------------------------------------------------------------------- */

const HEX = /^#[0-9a-fA-F]{6}$/;

const onboardSchema = z.object({
  team_name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(280).optional().nullable(),
  primary_color: z.string().regex(HEX, "Cor inválida").default("#4f46e5"),
  accent_color: z.string().regex(HEX, "Cor inválida").default("#818cf8"),
  logo_url: z.string().url().max(500).optional().nullable(),
  roster: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        ign: z.string().trim().max(40).optional().nullable(),
        lane: z
          .enum(["top", "jungle", "mid", "bot", "support", "flex"])
          .nullable()
          .optional(),
      }),
    )
    .max(20)
    .optional()
    .default([]),
});

function slugify(input: string) {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return base || "team";
}

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => onboardSchema.parse(input))
  .handler(async ({ context, data }) => {
    const userId = context.userId;

    // Refuse if user already has a team membership (avoid duplicate orgs)
    const { data: existing } = await supabaseAdmin
      .from("team_memberships")
      .select("id")
      .eq("user_id", userId)
      .limit(1);
    if (existing && existing.length > 0) {
      throw new Error("Você já pertence a uma equipe.");
    }

    // Generate a unique slug
    const baseSlug = slugify(data.team_name);
    let slug = baseSlug;
    for (let i = 1; i < 50; i++) {
      const { data: clash } = await supabaseAdmin
        .from("teams")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${baseSlug}-${i + 1}`;
    }

    // Create team
    const { data: team, error: tErr } = await supabaseAdmin
      .from("teams")
      .insert({
        name: data.team_name,
        slug,
        description: data.description ?? null,
        logo_url: data.logo_url ?? null,
        primary_color: data.primary_color,
        accent_color: data.accent_color,
      })
      .select("id, slug")
      .single();
    if (tErr) throw new Error(tErr.message);

    // Add user as coach of the new team
    const { error: tmErr } = await supabaseAdmin
      .from("team_memberships")
      .insert({ user_id: userId, team_id: team.id, team_role: "coach" });
    if (tmErr) throw new Error(tmErr.message);

    // Get/create the coach's roster member entry
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, member_id")
      .eq("user_id", userId)
      .maybeSingle();

    const coachName = profile?.display_name ?? "Coach";

    const { data: coachMember, error: cmErr } = await supabaseAdmin
      .from("members")
      .insert({
        team_id: team.id,
        name: coachName,
        role: "coach",
      })
      .select("id")
      .single();
    if (cmErr) throw new Error(cmErr.message);

    await supabaseAdmin
      .from("profiles")
      .update({ member_id: coachMember.id })
      .eq("user_id", userId);

    // Create roster members
    if (data.roster && data.roster.length > 0) {
      const rows = data.roster.map((r) => ({
        team_id: team.id,
        name: r.name,
        ign: r.ign ?? null,
        lane: r.lane ?? null,
        role: "player" as const,
      }));
      const { error: rErr } = await supabaseAdmin.from("members").insert(rows);
      if (rErr) throw new Error(rErr.message);
    }

    return { ok: true, team_id: team.id, slug: team.slug };
  });
