import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STAFF_ROLES = ["owner", "developer", "finance", "support", "marketing"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

async function getStaffRoles(userId: string): Promise<StaffRole[]> {
  const { data, error } = await supabaseAdmin
    .from("staff_members")
    .select("role, active")
    .eq("user_id", userId)
    .eq("active", true);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.role as StaffRole);
}

async function assertStaff(userId: string, requiredRole?: StaffRole) {
  const roles = await getStaffRoles(userId);
  if (roles.length === 0) throw new Error("Acesso restrito a funcionários.");
  if (requiredRole && !roles.includes("owner") && !roles.includes(requiredRole)) {
    throw new Error(`Acesso restrito à equipe de ${requiredRole}.`);
  }
  return roles;
}

async function assertOwner(userId: string) {
  const roles = await getStaffRoles(userId);
  if (!roles.includes("owner")) throw new Error("Apenas o proprietário pode executar esta ação.");
  return roles;
}

async function audit(opts: {
  staffUserId: string;
  staffRole?: StaffRole;
  action: string;
  targetUserId?: string | null;
  targetTeamId?: string | null;
  payload?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("staff_audit_log").insert({
    staff_user_id: opts.staffUserId,
    staff_role: opts.staffRole ?? null,
    action: opts.action,
    target_user_id: opts.targetUserId ?? null,
    target_team_id: opts.targetTeamId ?? null,
    payload: (opts.payload ?? {}) as never,
  } as never);
}

// ------------------- Staff CRUD -------------------

export const listStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);

    const { data: staff, error } = await supabaseAdmin
      .from("staff_members")
      .select("id, user_id, role, full_name, department, active, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const userIds = (staff ?? []).map((s) => s.user_id);
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const emailMap = new Map<string, string>();
    (usersList?.users ?? []).forEach((u) => emailMap.set(u.id, u.email ?? ""));

    return (staff ?? []).map((s) => ({
      ...s,
      email: emailMap.get(s.user_id) ?? "",
    }));
  });

const addStaffSchema = z.object({
  email: z.string().email().max(255),
  role: z.enum(STAFF_ROLES),
  full_name: z.string().trim().min(1).max(120),
  department: z.string().trim().max(120).optional().nullable(),
});

export const addStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => addStaffSchema.parse(input))
  .handler(async ({ context, data }) => {
    const callerRoles = await assertOwner(context.userId);

    // Find the user by email
    const { data: usersList, error: ulErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (ulErr) throw new Error(ulErr.message);
    const target = usersList.users.find(
      (u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase(),
    );
    if (!target) {
      throw new Error("Nenhum usuário encontrado com este email. Peça à pessoa para criar uma conta primeiro.");
    }

    const { error } = await supabaseAdmin.from("staff_members").insert({
      user_id: target.id,
      role: data.role,
      full_name: data.full_name,
      department: data.department ?? null,
      active: true,
    });
    if (error) throw new Error(error.message);

    await audit({
      staffUserId: context.userId,
      staffRole: callerRoles.includes("owner") ? "owner" : callerRoles[0],
      action: "staff.add",
      targetUserId: target.id,
      payload: { role: data.role, email: data.email },
    });

    return { ok: true };
  });

const updateStaffSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(STAFF_ROLES).optional(),
  full_name: z.string().trim().min(1).max(120).optional(),
  department: z.string().trim().max(120).nullable().optional(),
  active: z.boolean().optional(),
});

export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateStaffSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);

    const { id, ...patch } = data;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { data: existing } = await supabaseAdmin
      .from("staff_members")
      .select("user_id, role")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new Error("Funcionário não encontrado.");

    // Prevent demoting yourself if you are the only owner
    if (existing.user_id === context.userId && (patch.role && patch.role !== "owner" || patch.active === false)) {
      const { count } = await supabaseAdmin
        .from("staff_members")
        .select("id", { count: "exact", head: true })
        .eq("role", "owner")
        .eq("active", true);
      if ((count ?? 0) <= 1) {
        throw new Error("Você não pode remover ou rebaixar o último proprietário.");
      }
    }

    const { error } = await supabaseAdmin
      .from("staff_members")
      .update(patch as never)
      .eq("id", id);
    if (error) throw new Error(error.message);

    await audit({
      staffUserId: context.userId,
      staffRole: "owner",
      action: "staff.update",
      targetUserId: existing.user_id,
      payload: patch,
    });

    return { ok: true };
  });

const removeStaffSchema = z.object({ id: z.string().uuid() });

export const removeStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => removeStaffSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);

    const { data: existing } = await supabaseAdmin
      .from("staff_members")
      .select("user_id, role")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing) throw new Error("Funcionário não encontrado.");

    if (existing.user_id === context.userId) {
      throw new Error("Você não pode remover a si mesmo.");
    }

    const { error } = await supabaseAdmin.from("staff_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    await audit({
      staffUserId: context.userId,
      staffRole: "owner",
      action: "staff.remove",
      targetUserId: existing.user_id,
      payload: { role: existing.role },
    });

    return { ok: true };
  });

// ------------------- Audit log -------------------

export const listAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.userId);
    const { data, error } = await supabaseAdmin
      .from("staff_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const userIds = Array.from(
      new Set((data ?? []).flatMap((r) => [r.staff_user_id, r.target_user_id].filter(Boolean) as string[])),
    );
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailMap = new Map<string, string>();
    (usersList?.users ?? []).forEach((u) => emailMap.set(u.id, u.email ?? ""));

    return (data ?? []).map((row) => ({
      ...row,
      staff_email: emailMap.get(row.staff_user_id) ?? "",
      target_email: row.target_user_id ? emailMap.get(row.target_user_id) ?? "" : null,
    }));
  });
