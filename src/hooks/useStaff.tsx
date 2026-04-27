import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type StaffRole = "owner" | "developer" | "finance" | "support" | "marketing";

export type StaffMember = {
  id: string;
  user_id: string;
  role: StaffRole;
  full_name: string | null;
  department: string | null;
  active: boolean;
  created_at: string;
};

/**
 * Returns the current user's staff record (if any).
 * A user is "staff" only if they appear in `staff_members` with `active=true`.
 */
export function useStaff() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["my-staff", userId],
    queryFn: async (): Promise<StaffMember[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("staff_members")
        .select("id, user_id, role, full_name, department, active, created_at")
        .eq("user_id", userId)
        .eq("active", true);
      if (error) throw error;
      return (data ?? []) as StaffMember[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const memberships = data ?? [];
  const isStaff = memberships.length > 0;
  const roles = memberships.map((m) => m.role);
  const isOwner = roles.includes("owner");

  // Owner satisfies any role check.
  const hasStaffRole = (role: StaffRole) => isOwner || roles.includes(role);

  return {
    loading: authLoading || isLoading,
    isStaff,
    isOwner,
    roles,
    memberships,
    hasStaffRole,
    primaryRole: (isOwner ? "owner" : roles[0]) as StaffRole | undefined,
  };
}
