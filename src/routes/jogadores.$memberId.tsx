import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PlayerProfileView, type PlayerProfileMember } from "@/components/player/PlayerProfileView";
import type { PerfRow } from "@/lib/player-stats";

export const Route = createFileRoute("/jogadores/$memberId")({
  head: () => ({ meta: [{ title: "Perfil do jogador — Battle Arena" }] }),
  component: PlayerPage,
});

function PlayerPage() {
  const { memberId } = useParams({ from: "/jogadores/$memberId" });

  const { data: member } = useQuery({
    queryKey: ["member", memberId],
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("*").eq("id", memberId).single();
      if (error) throw error;
      return data as PlayerProfileMember;
    },
  });

  const { data: perfs = [] } = useQuery({
    queryKey: ["perfs", memberId],
    queryFn: async () => {
      const { data, error } = await supabase.from("match_performances").select("*").eq("member_id", memberId);
      if (error) throw error;
      return data as PerfRow[];
    },
  });

  const { data: scrims = [] } = useQuery({
    queryKey: ["scrims-for-perf"],
    queryFn: async () => {
      const { data, error } = await supabase.from("scrims").select("id, scheduled_at, result, opponent, best_of, opponent_id, status");
      if (error) throw error;
      return data as { id: string; scheduled_at: string; result: "win" | "loss" | "draw" | "pending"; opponent: string; best_of: number; opponent_id: string | null; status: "scheduled" | "completed" | "cancelled" }[];
    },
  });

  if (!member) {
    return <div className="text-center text-muted-foreground py-20 text-xs uppercase tracking-[0.3em]">Carregando perfil...</div>;
  }

  return (
    <div className="space-y-6">
      <Link to="/roster" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Roster
      </Link>

      <PlayerProfileView
        member={member}
        perfs={perfs}
        scrims={scrims}
        headerEyebrow="Jogador · Roster"
      />
    </div>
  );
}
