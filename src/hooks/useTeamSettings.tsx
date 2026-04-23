import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TeamSettings = {
  id: string;
  team_name: string;
  description: string | null;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
};

export function useTeamSettings() {
  return useQuery({
    queryKey: ["team-settings"],
    queryFn: async (): Promise<TeamSettings | null> => {
      const { data, error } = await supabase
        .from("team_settings")
        .select("id, team_name, description, logo_url, primary_color, accent_color")
        .eq("singleton", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}
