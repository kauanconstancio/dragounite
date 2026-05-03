import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PokemonPicker } from "@/components/PokemonPicker";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { Sparkles, Upload, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ExtractedPlayer = {
  name?: string;
  pokemon?: string;
  kills?: number;
  assists?: number;
  score?: number;
  damage_dealt?: number;
  damage_taken?: number;
  healing?: number;
  is_mvp?: boolean;
};

type RawExtractedPlayer = ExtractedPlayer | string;

type Extracted = {
  score_us: number;
  score_them: number;
  result: "win" | "loss" | "draw" | "unknown";
  ally_players: ExtractedPlayer[];
  opponent_players: ExtractedPlayer[];
  confidence?: number;
};

type Member = { id: string; name: string; ign: string | null; main_pokemon?: string | null };
type KnownOpponentPlayer = { name: string; pokemon?: string | null; lane?: string | null; notes?: string | null };

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function similarity(a: string, b: string) {
  const x = normalizeText(a);
  const y = normalizeText(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.85;
  const min = Math.min(x.length, y.length);
  let samePrefix = 0;
  while (samePrefix < min && x[samePrefix] === y[samePrefix]) samePrefix += 1;
  if (samePrefix >= 4) return 0.55;
  return 0;
}

function normalizeKnownPlayers(raw: any[] | null | undefined): KnownOpponentPlayer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      if (typeof p === "string") return { name: p };
      if (p && typeof p === "object" && p.name) {
        return { name: String(p.name), pokemon: p.pokemon ?? p.main_pokemon ?? null, lane: p.lane ?? null, notes: p.notes ?? null };
      }
      return null;
    })
    .filter(Boolean) as KnownOpponentPlayer[];
}

function num(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== "string") return 0;
  const compact = value.trim().toLowerCase().replace(/\s/g, "");
  const multiplier = compact.endsWith("k") ? 1000 : 1;
  const cleaned = compact.replace(/k$/, "").replace(/[^0-9.,]/g, "").replace(/[.,](?=\d{3}(\D|$))/g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * multiplier)) : 0;
}

function normalizeExtracted(raw: any): Extracted {
  const player = (entry: RawExtractedPlayer): ExtractedPlayer => {
    const p = typeof entry === "string" ? parsePlayerString(entry) : entry ?? {};
    return {
      name: String(p.name ?? (p as any).ign ?? (p as any).player_name ?? "").trim(),
      pokemon: String(p.pokemon ?? "").trim(),
      kills: num(p.kills),
      deaths: num(p.deaths),
      assists: num(p.assists),
      score: num(p.score),
      damage_dealt: num(p.damage_dealt ?? (p as any).damageDealt ?? (p as any).dano_causado ?? (p as any).dano),
      damage_taken: num(p.damage_taken ?? (p as any).damageTaken ?? (p as any).dano_recebido ?? (p as any).sofrido),
      healing: num(p.healing ?? (p as any).recovery ?? (p as any).recuperacao ?? (p as any).recuperação ?? (p as any).cura),
      is_mvp: bool(p.is_mvp ?? (p as any).mvp),
    };
  };
  return {
    score_us: num(raw.score_us),
    score_them: num(raw.score_them),
    result: raw.result ?? "unknown",
    ally_players: Array.isArray(raw.ally_players) ? raw.ally_players.map(player) : [],
    opponent_players: Array.isArray(raw.opponent_players) ? raw.opponent_players.map(player) : [],
    confidence: raw.confidence,
  };
}

function parsePlayerString(input: string): ExtractedPlayer {
  const out: Record<string, unknown> = {};
  const keys = [
    "damage_dealt", "damage_taken", "is_mvp", "name", "ign", "player_name", "pokemon",
    "kills", "deaths", "assists", "score", "healing", "recovery", "dano_causado",
    "dano_recebido", "recuperacao", "recuperação", "cura", "mvp",
  ];
  const keyPattern = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(?:^|[,;]\\s*)(${keyPattern})\\s*=\\s*([\\s\\S]*?)(?=(?:[,;]\\s*(?:${keyPattern})\\s*=)|$)`, "gi");
  for (const match of input.replace(/\bFalse\b/g, "false").replace(/\bTrue\b/g, "true").matchAll(regex)) {
    out[match[1].toLowerCase()] = match[2].trim().replace(/^[ '"]+|[ '"]+$/g, "");
  }
  return {
    name: String(out.name ?? out.ign ?? out.player_name ?? ""),
    pokemon: String(out.pokemon ?? ""),
    kills: num(out.kills),
    deaths: num(out.deaths),
    assists: num(out.assists),
    score: num(out.score),
    damage_dealt: num(out.damage_dealt ?? out.dano_causado),
    damage_taken: num(out.damage_taken ?? out.dano_recebido),
    healing: num(out.healing ?? out.recovery ?? out.recuperacao ?? out.recuperação ?? out.cura),
    is_mvp: bool(out.is_mvp ?? out.mvp),
  };
}

function bool(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return false;
  return ["true", "1", "yes", "sim", "mvp"].includes(value.trim().toLowerCase());
}

export function ImportMatchImageDialog({
  open,
  onOpenChange,
  scrimId,
  opponentId,
  bestOf,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scrimId: string;
  opponentId: string | null;
  bestOf: number;
}) {
  const qc = useQueryClient();
  const { team } = useCurrentTeam();
  const teamId = team?.id;
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Extracted | null>(null);
  const [gameNumber, setGameNumber] = useState(1);
  const [allyMemberIds, setAllyMemberIds] = useState<string[]>([]);

  const { data: members = [] } = useQuery({
    queryKey: ["members-import", teamId],
    queryFn: async () => {
      if (!teamId) return [] as Member[];
      const { data, error } = await supabase
        .from("members")
          .select("id, name, ign, role, main_pokemon")
        .eq("team_id", teamId)
        .eq("role", "player")
        .order("name");
      if (error) throw error;
      return data as Member[];
    },
    enabled: open && !!teamId,
  });

  const { data: opponentKnownPlayers = [] } = useQuery({
    queryKey: ["opponent-known-import", opponentId],
    queryFn: async () => {
      if (!opponentId) return [] as KnownOpponentPlayer[];
      const { data, error } = await supabase
        .from("opponents")
        .select("known_players")
        .eq("id", opponentId)
        .maybeSingle();
      if (error) throw error;
      return normalizeKnownPlayers(data?.known_players as any[] | null);
    },
    enabled: open && !!opponentId,
  });

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setPreviews([]);
      setData(null);
      setLoading(false);
      setAllyMemberIds([]);
      setGameNumber(1);
    }
  }, [open]);

  function onPick(list: FileList | null) {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    const merged = [...files, ...incoming].slice(0, 2);
    for (const f of merged) {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`"${f.name}" excede 5MB`);
        return;
      }
    }
    setFiles(merged);
    setData(null);
    Promise.all(
      merged.map(
        (f) =>
          new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = reject;
            r.readAsDataURL(f);
          }),
      ),
    ).then(setPreviews);
  }

  function removeFile(i: number) {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    setPreviews((p) => p.filter((_, idx) => idx !== i));
    setData(null);
  }


  async function analyze() {
    if (files.length === 0) return;
    setLoading(true);
    try {
      const images = await Promise.all(
        files.map(
          (f) =>
            new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const s = reader.result as string;
                resolve({ base64: s.split(",")[1] || "", mimeType: f.type || "image/png" });
              };
              reader.onerror = reject;
              reader.readAsDataURL(f);
            }),
        ),
      );
      const { data: res, error } = await supabase.functions.invoke("parse-match-image", {
        body: {
          images,
          allyRoster: members.map((m) => ({ name: m.name, ign: m.ign, pokemon: m.main_pokemon })),
          opponentRoster: opponentKnownPlayers.map((p) => ({ name: p.name, pokemon: p.pokemon })),
        },
      });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      const parsed = normalizeExtracted((res as any).data as Extracted);
      parsed.opponent_players = parsed.opponent_players.map((p) => {
        const top = opponentKnownPlayers
          .map((known) => ({
            known,
            score: Math.max(similarity(known.name, p.name ?? ""), similarity(known.pokemon ?? "", p.pokemon ?? "") * 0.35),
          }))
          .filter((c) => c.score >= 0.5)
          .sort((a, b) => b.score - a.score)[0];
        return top ? { ...p, name: top.known.name, pokemon: p.pokemon || top.known.pokemon || "" } : p;
      });
      setData(parsed);
      // auto-map allies by name similarity
      const used = new Set<string>();
      const mapped = (parsed.ally_players || []).map((p) => {
        const cands = members
          .map((m) => ({
            id: m.id,
            score: Math.max(
              similarity(m.name, p.name ?? ""),
              similarity(m.ign ?? "", p.name ?? ""),
              similarity(m.name, p.pokemon ?? "") * 0.25,
              similarity(m.main_pokemon ?? "", p.pokemon ?? "") * 0.4,
            ),
          }))
          .filter((c) => c.score >= 0.5 && !used.has(c.id))
          .sort((a, b) => b.score - a.score);
        const top = cands[0];
        if (top) used.add(top.id);
        return top?.id ?? "";
      });
      if ((parsed.ally_players?.length ?? 0) === 0 && (parsed.opponent_players?.length ?? 0) === 0) {
        toast.warning("A IA não encontrou linhas de jogadores. Use prints nítidos do placar e da tela Battle Performance.");
      }
      setAllyMemberIds(mapped);
      toast.success("Dados extraídos! Revise antes de salvar.");
    } catch (e: any) {
      toast.error(e.message || "Falha ao analisar imagem");
    } finally {
      setLoading(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!data || !teamId) return;
      // Allies: insert only those mapped to a member
      const allyRows = (data.ally_players || [])
        .map((p, i) => {
          const memberId = allyMemberIds[i];
          if (!memberId) return null;
          return {
            scrim_id: scrimId,
            team_id: teamId,
            member_id: memberId,
            game_number: gameNumber,
            pokemon: p.pokemon || null,
            kills: Number(p.kills) || 0,
            deaths: Number(p.deaths) || 0,
            assists: Number(p.assists) || 0,
            score: Number(p.score) || 0,
            damage_dealt: Number(p.damage_dealt) || 0,
            damage_taken: Number(p.damage_taken) || 0,
            healing: Number(p.healing) || 0,
            is_mvp: !!p.is_mvp,
          };
        })
        .filter(Boolean) as any[];
      if (allyRows.length) {
        const { error } = await supabase
          .from("match_performances")
          .upsert(allyRows, { onConflict: "scrim_id,member_id,game_number" });
        if (error) throw error;
      }
      // Opponents
      const oppRows = (data.opponent_players || [])
        .filter((p) => (p.name ?? "").trim())
        .map((p) => ({
          scrim_id: scrimId,
          team_id: teamId,
          opponent_id: opponentId,
          game_number: gameNumber,
          player_name: (p.name ?? "").trim(),
          pokemon: p.pokemon || null,
          kills: Number(p.kills) || 0,
          assists: Number(p.assists) || 0,
          score: Number(p.score) || 0,
          damage_dealt: Number(p.damage_dealt) || 0,
          damage_taken: Number(p.damage_taken) || 0,
          healing: Number(p.healing) || 0,
        }));
      if (oppRows.length) {
        // Replace existing rows for this game
        await supabase
          .from("opponent_performances")
          .delete()
          .eq("scrim_id", scrimId)
          .eq("game_number", gameNumber);
        const { error } = await supabase.from("opponent_performances").insert(oppRows);
        if (error) throw error;
      }
      // Recalculate scrim score
      const [{ data: a }, { data: o }] = await Promise.all([
        supabase.from("match_performances").select("game_number, score").eq("scrim_id", scrimId),
        supabase.from("opponent_performances").select("game_number, score").eq("scrim_id", scrimId),
      ]);
      const allyByGame = new Map<number, number>();
      const oppByGame = new Map<number, number>();
      (a ?? []).forEach((r: any) =>
        allyByGame.set(r.game_number, (allyByGame.get(r.game_number) ?? 0) + (r.score ?? 0)),
      );
      (o ?? []).forEach((r: any) =>
        oppByGame.set(r.game_number, (oppByGame.get(r.game_number) ?? 0) + (r.score ?? 0)),
      );
      let usWins = 0;
      let themWins = 0;
      const allGames = new Set<number>([...allyByGame.keys(), ...oppByGame.keys()]);
      allGames.forEach((g) => {
        const av = allyByGame.get(g) ?? 0;
        const ov = oppByGame.get(g) ?? 0;
        if (av > ov) usWins++;
        else if (ov > av) themWins++;
      });
      await supabase
        .from("scrims")
        .update({ score_us: usWins, score_them: themWins })
        .eq("id", scrimId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perfs-scrim", scrimId] });
      qc.invalidateQueries({ queryKey: ["opp-perfs-scrim", scrimId] });
      qc.invalidateQueries({ queryKey: ["scrims"] });
      qc.invalidateQueries({ queryKey: ["perfs"] });
      toast.success(`Jogo ${gameNumber} importado`);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateAlly = (i: number, patch: Partial<ExtractedPlayer>) => {
    setData((d) =>
      d ? { ...d, ally_players: d.ally_players.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) } : d,
    );
  };
  const updateOpp = (i: number, patch: Partial<ExtractedPlayer>) => {
    setData((d) =>
      d
        ? { ...d, opponent_players: d.opponent_players.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }
        : d,
    );
  };

  const games = useMemo(() => Array.from({ length: bestOf }, (_, i) => i + 1), [bestOf]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display tracking-wider">
            <Sparkles className="h-5 w-5 text-primary" /> Importar print da partida (IA)
          </DialogTitle>
          <DialogDescription>
            Envie até 2 prints da MESMA partida: <strong>(1) tela de placar</strong> (KDA, pontos,
            MVP) e <strong>(2) tela de estatísticas detalhadas</strong> (dano causado, sofrido e
            cura). A IA combina ambas e você revisa antes de salvar.
          </DialogDescription>
        </DialogHeader>

        {!data && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs uppercase tracking-widest">Jogo</Label>
              <Select value={String(gameNumber)} onValueChange={(v) => setGameNumber(Number(v))}>
                <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {games.map((g) => <SelectItem key={g} value={String(g)}>Jogo {g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-md p-8 cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground text-center">
                {files.length === 0
                  ? "Clique para escolher até 2 prints (placar e/ou estatísticas detalhadas — PNG/JPG, máx 5MB cada)"
                  : files.length === 1
                  ? "1 imagem selecionada — você pode adicionar mais 1 (estatísticas detalhadas)"
                  : "2 imagens selecionadas"}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                disabled={files.length >= 2}
                onChange={(e) => {
                  onPick(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            {previews.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative">
                    <img
                      src={src}
                      alt={`preview ${i + 1}`}
                      className="max-h-56 w-full object-contain rounded border border-border bg-card/40"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="absolute top-1 right-1 h-7 px-2 text-xs"
                      onClick={() => removeFile(i)}
                    >
                      Remover
                    </Button>
                    <div className="absolute bottom-1 left-1 text-[10px] uppercase tracking-widest bg-background/80 px-1.5 py-0.5 rounded">
                      Print {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={analyze}
                disabled={files.length === 0 || loading}
                className="bg-gradient-primary"
              >
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analisando...</> : <><Sparkles className="h-4 w-4 mr-2" />Analisar com IA</>}
              </Button>
            </DialogFooter>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 grid grid-cols-2 gap-2 items-center">
                <Card className="p-3 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Nosso time</div>
                  <div className="font-display text-3xl text-primary tabular-nums">{data.score_us}</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Oponente</div>
                  <div className="font-display text-3xl text-destructive tabular-nums">{data.score_them}</div>
                </Card>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs uppercase tracking-widest">Jogo</Label>
                <Select value={String(gameNumber)} onValueChange={(v) => setGameNumber(Number(v))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {games.map((g) => <SelectItem key={g} value={String(g)}>Jogo {g}</SelectItem>)}
                  </SelectContent>
                </Select>
                {data.confidence != null && (
                  <div className="text-[10px] text-muted-foreground">
                    Confiança IA: {Math.round((data.confidence ?? 0) * 100)}%
                  </div>
                )}
              </div>
            </div>

            <Section title="Nosso time" accent="primary">
              {data.ally_players.map((p, i) => (
                <PlayerEditor
                  key={`a-${i}`}
                  player={p}
                  onChange={(patch) => updateAlly(i, patch)}
                  leading={
                    <Select
                      value={allyMemberIds[i] ?? ""}
                      onValueChange={(v) =>
                        setAllyMemberIds((arr) => arr.map((x, idx) => (idx === i ? v : x)))
                      }
                    >
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={p.name || "Jogador"} /></SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}{m.ign ? ` (${m.ign})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  }
                  hint={p.name ? `Detectado: ${p.name}` : undefined}
                  showMvp
                />
              ))}
              {data.ally_players.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Nenhum jogador aliado detectado.</p>
              )}
            </Section>

            <Section title="Oponente" accent="destructive">
              {data.opponent_players.map((p, i) => (
                <PlayerEditor
                  key={`o-${i}`}
                  player={p}
                  onChange={(patch) => updateOpp(i, patch)}
                  leading={
                    <div className="grid gap-1.5">
                      {opponentKnownPlayers.length > 0 && (
                        <Select
                          value={opponentKnownPlayers.some((known) => known.name === p.name) ? p.name : undefined}
                          onValueChange={(v) => updateOpp(i, { name: v })}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Selecionar oponente" />
                          </SelectTrigger>
                          <SelectContent>
                            {opponentKnownPlayers.map((known) => (
                              <SelectItem key={known.name} value={known.name}>
                                {known.name}{known.pokemon ? ` (${known.pokemon})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Input
                        value={p.name ?? ""}
                        onChange={(e) => updateOpp(i, { name: e.target.value })}
                        placeholder="Nome detectado do oponente"
                        className="h-9 text-sm"
                      />
                    </div>
                  }
                  hint={p.name ? `Detectado: ${p.name}` : undefined}
                />
              ))}
              {data.opponent_players.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Nenhum oponente detectado.</p>
              )}
            </Section>

            <DialogFooter>
              <Button variant="outline" onClick={() => setData(null)}>Voltar</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-gradient-primary">
                {save.isPending ? "Salvando..." : `Salvar Jogo ${gameNumber}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent: "primary" | "destructive";
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div
        className={cn(
          "px-3 py-2 text-xs uppercase tracking-widest font-display",
          accent === "primary" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive",
        )}
      >
        {title}
      </div>
      <div className="p-2 space-y-2 bg-card/40">{children}</div>
    </div>
  );
}

function PlayerEditor({
  player,
  leading,
  onChange,
  showMvp,
  hint,
}: {
  player: ExtractedPlayer;
  leading: React.ReactNode;
  onChange: (patch: Partial<ExtractedPlayer>) => void;
  showMvp?: boolean;
  hint?: string;
}) {
  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">{leading}</div>
        <div className="w-[200px] shrink-0">
          <PokemonPicker
            value={player.pokemon || null}
            onChange={(name) => onChange({ pokemon: name ?? "" })}
          />
        </div>
        {showMvp && (
          <label className="flex items-center gap-1.5 px-2 cursor-pointer shrink-0">
            <Checkbox
              checked={!!player.is_mvp}
              onCheckedChange={(v) => onChange({ is_mvp: !!v })}
            />
            <Crown className={cn("h-4 w-4", player.is_mvp ? "text-gold" : "text-muted-foreground")} />
          </label>
        )}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground italic">{hint}</p>}
      <div className="grid grid-cols-7 gap-2">
        <NumField label="Score" value={player.score} onChange={(n) => onChange({ score: n })} />
        <NumField label="Kills" value={player.kills} onChange={(n) => onChange({ kills: n })} />
        <NumField label="Deaths" value={player.deaths} onChange={(n) => onChange({ deaths: n })} />
        <NumField label="Assist." value={player.assists} onChange={(n) => onChange({ assists: n })} />
        <NumField label="Dano" value={player.damage_dealt} onChange={(n) => onChange({ damage_dealt: n })} />
        <NumField label="Sofrido" value={player.damage_taken} onChange={(n) => onChange({ damage_taken: n })} />
        <NumField label="Cura" value={player.healing} onChange={(n) => onChange({ healing: n })} />
      </div>
    </Card>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <Label className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-9 text-sm tabular-nums px-2"
      />
    </div>
  );
}
