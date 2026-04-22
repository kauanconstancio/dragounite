import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type PerfRow } from "@/lib/player-stats";
import { PokemonImage } from "@/components/PokemonImage";
import { Crown, Swords, HandHeart, Trophy, ThumbsUp, UserPlus, UserMinus, AlertCircle } from "lucide-react";
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

type Tab = "details" | "battle";

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
  const [tab, setTab] = useState<Tab>("details");

  const { data: members = [] } = useQuery({
    queryKey: ["members-min-results"],
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("id, name, ign");
      if (error) throw error;
      return data as Member[];
    },
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

  // Totals for percentage bars on battle tab
  const allyDmgTotal = allyGame.reduce((s, r) => s + (r.damage_dealt || 0), 0);
  const allyTakenTotal = allyGame.reduce((s, r) => s + (r.damage_taken || 0), 0);
  const allyHealTotal = allyGame.reduce((s, r) => s + (r.healing || 0), 0);
  const oppDmgTotal = oppGame.reduce((s, r) => s + (r.damage_dealt || 0), 0);
  const oppTakenTotal = oppGame.reduce((s, r) => s + (r.damage_taken || 0), 0);
  const oppHealTotal = oppGame.reduce((s, r) => s + (r.healing || 0), 0);

  // MVP: highest score on each side
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
        <div className="ml-auto flex items-center gap-1 rounded-md border border-border p-1">
          <TabButton active={tab === "details"} onClick={() => setTab("details")}>Detalhes</TabButton>
          <TabButton active={tab === "battle"} onClick={() => setTab("battle")}>Dados de batalha</TabButton>
        </div>
      </div>

      {/* Header banner */}
      <div className="grid grid-cols-2 gap-px bg-border rounded-lg overflow-hidden border border-border">
        <div className={cn(
          "px-5 py-3 flex items-center justify-between",
          allyWon ? "bg-gradient-to-r from-primary/30 to-primary/10" : "bg-card/60",
        )}>
          <div className="font-display text-xl tracking-widest">
            <span className={cn(allyWon && "text-primary")}>
              {allyWon ? "VITÓRIA" : oppWon ? "DERROTA" : "—"}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Nosso time</span>
            <span className="font-display text-3xl text-primary tabular-nums">{allyTotal}</span>
          </div>
        </div>
        <div className={cn(
          "px-5 py-3 flex items-center justify-between",
          oppWon ? "bg-gradient-to-l from-destructive/30 to-destructive/10" : "bg-card/60",
        )}>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl text-destructive tabular-nums">{oppTotal}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{opponentName || "Oponente"}</span>
          </div>
          <div className="font-display text-xl tracking-widest">
            <span className={cn(oppWon && "text-destructive")}>
              {oppWon ? "VITÓRIA" : allyWon ? "DERROTA" : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Two columns of player rows */}
      <div className="grid grid-cols-2 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {/* Ally column */}
        <div className={cn(
          "p-2 space-y-1.5",
          allyWon ? "bg-primary/10" : "bg-card/40",
        )}>
          {tab === "details" && <DetailsHeader side="ally" />}
          {tab === "battle" && <BattleHeader side="ally" />}
          {allyGame.length === 0 && <EmptyState side="ally" />}
          {allyGame.map((r) => {
            const m = memberMap.get(r.member_id);
            const display = m?.ign || m?.name || "—";
            const isMvp = r.is_mvp || r.id === allyMvpId;
            return tab === "details" ? (
              <DetailsRow
                key={r.id}
                side="ally"
                name={display}
                pokemon={r.pokemon}
                score={r.score}
                kills={r.kills}
                assists={r.assists}
                isMvp={isMvp}
              />
            ) : (
              <BattleRow
                key={r.id}
                side="ally"
                name={display}
                pokemon={r.pokemon}
                damageDealt={r.damage_dealt}
                damageTaken={r.damage_taken}
                healing={r.healing}
                dealtTotal={allyDmgTotal}
                takenTotal={allyTakenTotal}
                healTotal={allyHealTotal}
              />
            );
          })}
        </div>

        {/* Opp column */}
        <div className={cn(
          "p-2 space-y-1.5",
          oppWon ? "bg-destructive/10" : "bg-card/40",
        )}>
          {tab === "details" && <DetailsHeader side="opp" />}
          {tab === "battle" && <BattleHeader side="opp" />}
          {oppGame.length === 0 && <EmptyState side="opp" />}
          {oppGame.map((r) => {
            const isMvp = r.id === oppMvpId;
            return tab === "details" ? (
              <DetailsRow
                key={r.id}
                side="opp"
                name={r.player_name}
                pokemon={r.pokemon}
                score={r.score}
                kills={r.kills}
                assists={r.assists}
                isMvp={isMvp}
              />
            ) : (
              <BattleRow
                key={r.id}
                side="opp"
                name={r.player_name}
                pokemon={r.pokemon}
                damageDealt={r.damage_dealt}
                damageTaken={r.damage_taken}
                healing={r.healing}
                dealtTotal={oppDmgTotal}
                takenTotal={oppTakenTotal}
                healTotal={oppHealTotal}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1 text-xs uppercase tracking-wider rounded transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ side }: { side: "ally" | "opp" }) {
  return (
    <div className={cn(
      "flex items-center justify-center gap-2 py-8 text-xs uppercase tracking-widest",
      side === "ally" ? "text-primary/60" : "text-destructive/60",
    )}>
      <AlertCircle className="h-4 w-4" /> Sem dados
    </div>
  );
}

function DetailsHeader({ side }: { side: "ally" | "opp" }) {
  const color = side === "ally" ? "text-primary" : "text-destructive";
  return (
    <div className={cn("flex items-center gap-3 px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground", color)}>
      <span className="flex-1 min-w-0" />
      <span className="w-12 flex items-center justify-center"><Trophy className="h-3.5 w-3.5" /></span>
      <span className="w-10 flex items-center justify-center"><Swords className="h-3.5 w-3.5" /></span>
      <span className="w-10 flex items-center justify-center"><HandHeart className="h-3.5 w-3.5" /></span>
      <span className="w-10 text-center">MVP</span>
    </div>
  );
}

function DetailsRow({
  side, name, pokemon, score, kills, assists, isMvp,
}: {
  side: "ally" | "opp";
  name: string;
  pokemon: string | null;
  score: number;
  kills: number;
  assists: number;
  isMvp: boolean;
}) {
  const accent = side === "ally" ? "text-primary" : "text-destructive";
  return (
    <div className={cn(
      "flex items-center gap-3 px-2 py-2 rounded-md",
      side === "ally" ? "bg-primary/5 hover:bg-primary/10" : "bg-destructive/5 hover:bg-destructive/10",
    )}>
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <div className="w-8 h-8 shrink-0"><PokemonImage name={pokemon} /></div>
        <span className="font-display text-sm tracking-wide truncate">{name}</span>
      </div>
      <span className={cn("font-display text-base tabular-nums w-12 text-center", accent)}>{score}</span>
      <span className="font-display text-base tabular-nums w-10 text-center text-foreground">{kills}</span>
      <span className="font-display text-base tabular-nums w-10 text-center text-foreground">{assists}</span>
      <span className="w-10 flex items-center justify-center">
        {isMvp ? <Crown className="h-4 w-4 text-gold" /> : <span className="text-muted-foreground/40">—</span>}
      </span>
    </div>
  );
}

function BattleHeader({ side }: { side: "ally" | "opp" }) {
  const color = side === "ally" ? "text-primary" : "text-destructive";
  return (
    <div className={cn("grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] items-center gap-3 px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground", color)}>
      <span />
      <span className="text-center">Dano causado</span>
      <span className="text-center">Dano sofrido</span>
      <span className="text-center">Recuperação</span>
    </div>
  );
}

function BattleRow({
  side, name, pokemon, damageDealt, damageTaken, healing, dealtTotal, takenTotal, healTotal,
}: {
  side: "ally" | "opp";
  name: string;
  pokemon: string | null;
  damageDealt: number;
  damageTaken: number;
  healing: number;
  dealtTotal: number;
  takenTotal: number;
  healTotal: number;
}) {
  return (
    <div className={cn(
      "grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] items-center gap-3 px-2 py-2 rounded-md",
      side === "ally" ? "bg-primary/5 hover:bg-primary/10" : "bg-destructive/5 hover:bg-destructive/10",
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 shrink-0"><PokemonImage name={pokemon} /></div>
        <span className="font-display text-sm tracking-wide truncate">{name}</span>
      </div>
      <BattleStat value={damageDealt} total={dealtTotal} barClass="bg-rose-500/70" />
      <BattleStat value={damageTaken} total={takenTotal} barClass="bg-sky-500/70" />
      <BattleStat value={healing} total={healTotal} barClass="bg-emerald-500/70" />
    </div>
  );
}

function BattleStat({ value, total, barClass }: { value: number; total: number; barClass: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-display text-sm tabular-nums">{value.toLocaleString("pt-BR")}</span>
      <div className="w-full h-1.5 rounded-full bg-muted/40 overflow-hidden">
        <div className={cn("h-full rounded-full", barClass)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-[9px] tabular-nums text-muted-foreground">{pct.toFixed(1)}%</span>
    </div>
  );
}
