import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "coach" | "player" | "viewer";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  roles: AppRole[];
  hasRole: (r: AppRole) => boolean;
  canEdit: boolean; // coach OR player
  isCoach: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  const { data: roles = [] } = useQuery({
    queryKey: ["my-roles", userId],
    queryFn: async () => {
      if (!userId) return [] as AppRole[];
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const hasRole = (r: AppRole) => roles.includes(r);
  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    loading,
    roles,
    hasRole,
    canEdit: hasRole("coach") || hasRole("player"),
    isCoach: hasRole("coach"),
    signOut: async () => { await supabase.auth.signOut(); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
