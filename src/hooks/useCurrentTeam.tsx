import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type TeamRole = "coach" | "player" | "viewer";

export type TeamRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  archived: boolean;
};

export type TeamMembershipEntry = {
  team: TeamRow;
  team_role: TeamRole;
};

const ACTIVE_TEAM_KEY = "active-team-id";

type Ctx = {
  loading: boolean;
  teams: TeamMembershipEntry[];
  team: TeamRow | null;
  teamRole: TeamRole | null;
  /** true if user can edit (coach/player) in active team OR is super admin */
  canEditTeam: boolean;
  /** true if user is coach in active team OR super admin */
  isTeamCoach: boolean;
  setActiveTeam: (teamId: string | null) => void;
  refresh: () => Promise<void>;
};

const TeamCtx = createContext<Ctx | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user, hasRole } = useAuth();
  const qc = useQueryClient();
  const isSuperAdmin = hasRole("super_admin" as any);
  const [activeId, setActiveIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACTIVE_TEAM_KEY);
  });

  const userId = user?.id;

  const teamsQ = useQuery({
    queryKey: ["my-teams", userId, isSuperAdmin],
    queryFn: async (): Promise<TeamMembershipEntry[]> => {
      if (!userId) return [];
      // Super admins see all teams; otherwise only memberships.
      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from("teams")
          .select("id, slug, name, description, logo_url, primary_color, accent_color, archived")
          .order("name");
        if (error) throw error;
        return (data ?? []).map((t) => ({ team: t as TeamRow, team_role: "coach" as TeamRole }));
      }
      const { data, error } = await supabase
        .from("team_memberships")
        .select(
          "team_role, team:teams(id, slug, name, description, logo_url, primary_color, accent_color, archived)",
        )
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? [])
        .filter((row: any) => row.team)
        .map((row: any) => ({ team: row.team as TeamRow, team_role: row.team_role as TeamRole }));
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const teams = teamsQ.data ?? [];

  // Resolve active team
  const activeEntry = useMemo(() => {
    if (!teams.length) return null;
    if (activeId) {
      const found = teams.find((t) => t.team.id === activeId);
      if (found) return found;
    }
    return teams[0] ?? null;
  }, [teams, activeId]);

  // Persist when resolved or fallback
  useEffect(() => {
    if (activeEntry && activeEntry.team.id !== activeId) {
      setActiveIdState(activeEntry.team.id);
      try {
        localStorage.setItem(ACTIVE_TEAM_KEY, activeEntry.team.id);
      } catch {}
    }
  }, [activeEntry, activeId]);

  const setActiveTeam = useCallback((teamId: string | null) => {
    setActiveIdState(teamId);
    try {
      if (teamId) localStorage.setItem(ACTIVE_TEAM_KEY, teamId);
      else localStorage.removeItem(ACTIVE_TEAM_KEY);
    } catch {}
    // Invalidate any team-scoped queries by tag
    qc.invalidateQueries();
  }, [qc]);

  const refresh = useCallback(async () => {
    await teamsQ.refetch();
  }, [teamsQ]);

  const teamRole = activeEntry?.team_role ?? null;
  const value: Ctx = {
    loading: teamsQ.isLoading,
    teams,
    team: activeEntry?.team ?? null,
    teamRole,
    canEditTeam: isSuperAdmin || teamRole === "coach" || teamRole === "player",
    isTeamCoach: isSuperAdmin || teamRole === "coach",
    setActiveTeam,
    refresh,
  };

  return <TeamCtx.Provider value={value}>{children}</TeamCtx.Provider>;
}

export function useCurrentTeam() {
  const v = useContext(TeamCtx);
  if (!v) throw new Error("useCurrentTeam must be used within TeamProvider");
  return v;
}
