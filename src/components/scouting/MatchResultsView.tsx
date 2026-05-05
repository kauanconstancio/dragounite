import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { type PerfRow } from "@/lib/player-stats";
import { PokemonImage } from "@/components/PokemonImage";
import { Crown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Member = { id: string; name: string; ign: string | null };

type AllyRow = PerfRow;
type OppRow = {
  id: string;
  scrim_id: string;
  opponent_id: string | null;
  game_number: number;
  player_name: string;
  pokemon: string | null;
  kills: number;
  assists: number;
  score: number;
  damage_dealt: number;
  damage_taken: number;
  healing: number;
  rating: number | null;
  notes: string | null;
};

type NormalizedRow = {
  id: string;
  name: string;
  pokemon: string | null;
  kills: number;
  assists: number;
  score: number;
  damage_dealt: number;
  damage_taken: number;
  healing: number;
  isMvp: boolean;
};

function fmtK(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString("pt-BR");
}

export function MatchResultsView({
  scrimId,
  bestOf,
  opponentName,
}: {
  scrimId: string;
  bestOf: number;
  opponentName: string;
}) {
  const [game, setGame] = useState(1);
  const { team } = useCurrentTeam();
  const teamId = team?.id;

  const { data: members = [] } = useQuery({
    queryKey: ["members-min-results", teamId],
    queryFn: async () => {
      if (!teamId) return [] as Member[];
      const { data, error } = await supabase.from("members").select("id, name, ign").eq("team_id", teamId);
      if (error) throw error;
      return data as Member[];
    },
    enabled: !!teamId,
  });

  const { data: allies = [] } = useQuery({
    queryKey: ["perfs-scrim-view", scrimId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_performances").select("*").eq("scrim_id", scrimId).order("game_number");
      if (error) throw error;
      return data as AllyRow[];
    },
  });

  const { data: opps = [] } = useQuery({
    queryKey: ["opp-perfs-scrim-view", scrimId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opponent_performances").select("*").eq("scrim_id", scrimId).order("game_number");
      if (error) throw error;
      return data as OppRow[];
    },
  });

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const games = Array.from({ length: bestOf }, (_, i) => i + 1);
  const allyGame = useMemo(() => allies.filter((a) => a.game_number === game), [allies, game]);
  const oppGame = useMemo(() => opps.filter((o) => o.game_number === game), [opps, game]);

  const allyTotal = allyGame.reduce((s, r) => s + (r.score || 0), 0);
  const oppTotal = oppGame.reduce((s, r) => s + (r.score || 0), 0);
  const allyWon = allyTotal > oppTotal && (allyTotal > 0 || oppTotal > 0);
  const oppWon = oppTotal > allyTotal && (allyTotal > 0 || oppTotal > 0);

  const allyMvpId = allyGame.reduce<string | null>((best, r) => {
    if (!best) return r.id;
    const cur = allyGame.find((x) => x.id === best);
    return r.score > (cur?.score ?? 0) ? r.id : best;
  }, null);
  const oppMvpId = oppGame.reduce<string | null>((best, r) => {
    if (!best) return r.id;
    const cur = oppGame.find((x) => x.id === best);
    return r.score > (cur?.score ?? 0) ? r.id : best;
  }, null);

  const allyRows: NormalizedRow[] = allyGame.map((r) => {
    const m = r.member_id ? memberMap.get(r.member_id) : null;
    return {
      id: r.id,
      name: m?.ign || m?.name || r.player_name || "Convidado",
      pokemon: r.pokemon,
      kills: r.kills,
      assists: r.assists,
      score: r.score,
      damage_dealt: r.damage_dealt,
      damage_taken: r.damage_taken,
      healing: r.healing,
      isMvp: r.is_mvp || r.id === allyMvpId,
    };
  });

  const oppRows: NormalizedRow[] = oppGame.map((r) => ({
    id: r.id,
    name: r.player_name,
    pokemon: r.pokemon,
    kills: r.kills,
    assists: r.assists,
    score: r.score,
    damage_dealt: r.damage_dealt,
    damage_taken: r.damage_taken,
    healing: r.healing,
    isMvp: r.id === oppMvpId,
  }));

  return (
    <div className="space-y-4">
      {/* Game selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {games.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGame(g)}
            className={cn(
              "px-3 py-1.5 text-xs uppercase tracking-wider rounded-md border transition-colors",
              game === g
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            Jogo {g}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <TeamBlock
          label={team?.name || "Nosso time"}
          score={allyTotal}
          won={allyWon}
          lost={oppWon}
          rows={allyRows}
          side="ally"
        />
        <TeamBlock
          label={opponentName || "Oponente"}
          score={oppTotal}
          won={oppWon}
          lost={allyWon}
          rows={oppRows}
          side="opp"
        />
      </div>
    </div>
  );
}

function TeamBlock({
  label, score, won, lost, rows, side,
}: {
  label: string;
  score: number;
  won: boolean;
  lost: boolean;
  rows: NormalizedRow[];
  side: "ally" | "opp";
}) {
  const accent = side === "ally" ? "primary" : "destructive";
  return (
    <div className={cn(
      "rounded-lg border overflow-hidden",
      side === "ally" ? "border-primary/30" : "border-destructive/30",
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 flex-wrap",
        side === "ally" ? "bg-primary/10" : "bg-destructive/10",
      )}>
        <span className={cn(
          "font-display text-lg sm:text-xl tracking-widest truncate",
          side === "ally" ? "text-primary" : "text-destructive",
        )}>
          {label}
        </span>
        <span className={cn(
          "font-display text-2xl sm:text-3xl tabular-nums",
          side === "ally" ? "text-primary" : "text-destructive",
        )}>
          {score}
        </span>
        <span className={cn(
          "ml-auto px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-semibold",
          won && "bg-primary/20 text-primary",
          lost && "bg-destructive/20 text-destructive",
          !won && !lost && "bg-muted text-muted-foreground",
        )}>
          {won ? "Vitória" : lost ? "Derrota" : "—"}
        </span>
      </div>

      {/* Body */}
      {rows.length === 0 ? (
        <div className={cn(
          "flex items-center justify-center gap-2 py-8 text-xs uppercase tracking-widest",
          side === "ally" ? "text-primary/60" : "text-destructive/60",
        )}>
          <AlertCircle className="h-4 w-4" /> Sem dados
        </div>
      ) : (
        <div className="overflow-x-auto bg-card/40">
          <table className="w-full text-sm sm:min-w-0">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/40">
                <th className="text-left font-medium px-3 py-2">Player</th>
                <th className="text-center font-medium px-2 py-2">KOs</th>
                <th className="text-center font-medium px-2 py-2">AST</th>
                <th className="text-center font-medium px-2 py-2 hidden sm:table-cell">DMG</th>
                <th className="text-center font-medium px-2 py-2 hidden sm:table-cell">TKN</th>
                <th className="text-center font-medium px-2 py-2 hidden sm:table-cell">HEAL</th>
                <th className="text-center font-medium px-2 py-2">PTS</th>
                <th className="text-center font-medium px-2 py-2">MVP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={cn(
                    "border-b border-border/20 last:border-0",
                    r.isMvp && (side === "ally" ? "bg-primary/5" : "bg-destructive/5"),
                  )}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 shrink-0"><PokemonImage name={r.pokemon} /></div>
                      <span className="font-display text-sm tracking-wide truncate">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center font-display tabular-nums">{r.kills}</td>
                  <td className="px-2 py-2 text-center font-display tabular-nums">{r.assists}</td>
                  <td className="px-2 py-2 text-center font-display tabular-nums hidden sm:table-cell text-rose-400">{fmtK(r.damage_dealt)}</td>
                  <td className="px-2 py-2 text-center font-display tabular-nums hidden sm:table-cell text-sky-400">{fmtK(r.damage_taken)}</td>
                  <td className="px-2 py-2 text-center font-display tabular-nums hidden sm:table-cell text-emerald-400">{fmtK(r.healing)}</td>
                  <td className={cn(
                    "px-2 py-2 text-center font-display tabular-nums font-semibold",
                    side === "ally" ? "text-primary" : "text-destructive",
                  )}>
                    {r.score}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {r.isMvp ? (
                      <Crown className="h-4 w-4 text-gold mx-auto" />
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
