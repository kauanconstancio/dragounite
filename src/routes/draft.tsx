import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RotateCcw, Ban, Play, Trophy, Undo2 } from "lucide-react";
import { POKEMON_DATA, UNITE_ROLE_LABEL, UNITE_ROLE_STYLES, type UniteRole } from "@/lib/pokemon";
import { PokemonImage } from "@/components/PokemonImage";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/draft")({
  head: () => ({
    meta: [
      { title: "Draft Simulator — Battle Arena" },
      { name: "description", content: "Simulador de pick & ban no estilo competitivo do Pokémon Unite." },
      { property: "og:title", content: "Draft Simulator — Battle Arena" },
      { property: "og:description", content: "Treine bans e picks com a ordem oficial de draft do Unite." },
    ],
  }),
  component: DraftPage,
});

type Side = "blue" | "orange";
type Phase = "ban" | "pick";
type Slot = { side: Side; phase: Phase; index: number };

// Ordem oficial de draft competitivo (Bo* — pick & ban)
// Bans alternados (3 cada), depois picks no padrão snake 1-2-2-2-2-1
const DRAFT_ORDER: Slot[] = [
  // Ban phase
  { side: "blue", phase: "ban", index: 0 },
  { side: "orange", phase: "ban", index: 0 },
  { side: "blue", phase: "ban", index: 1 },
  { side: "orange", phase: "ban", index: 1 },
  { side: "blue", phase: "ban", index: 2 },
  { side: "orange", phase: "ban", index: 2 },
  // Pick phase (snake)
  { side: "blue", phase: "pick", index: 0 },
  { side: "orange", phase: "pick", index: 0 },
  { side: "orange", phase: "pick", index: 1 },
  { side: "blue", phase: "pick", index: 1 },
  { side: "blue", phase: "pick", index: 2 },
  { side: "orange", phase: "pick", index: 2 },
  { side: "orange", phase: "pick", index: 3 },
  { side: "blue", phase: "pick", index: 3 },
  { side: "blue", phase: "pick", index: 4 },
  { side: "orange", phase: "pick", index: 4 },
];

const ROLE_FILTERS: (UniteRole | "all")[] = ["all", "attacker", "speedster", "all-rounder", "defender", "supporter"];

type DraftState = {
  blueBans: (string | null)[];
  orangeBans: (string | null)[];
  bluePicks: (string | null)[];
  orangePicks: (string | null)[];
};

const INITIAL: DraftState = {
  blueBans: [null, null, null],
  orangeBans: [null, null, null],
  bluePicks: [null, null, null, null, null],
  orangePicks: [null, null, null, null, null],
};

function DraftPage() {
  const [state, setState] = useState<DraftState>(INITIAL);
  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UniteRole | "all">("all");

  const used = useMemo(() => {
    const set = new Set<string>();
    [...state.blueBans, ...state.orangeBans, ...state.bluePicks, ...state.orangePicks]
      .filter(Boolean)
      .forEach((n) => set.add(n as string));
    return set;
  }, [state]);

  const finished = step >= DRAFT_ORDER.length;
  const currentSlot = !finished ? DRAFT_ORDER[step] : null;

  const filtered = POKEMON_DATA.filter((p) => {
    if (roleFilter !== "all" && p.role !== roleFilter) return false;
    return p.name.toLowerCase().includes(query.toLowerCase().trim());
  });

  function selectPokemon(name: string) {
    if (!currentSlot || used.has(name)) return;
    setState((prev) => {
      const next = { ...prev };
      const key =
        currentSlot.side === "blue"
          ? currentSlot.phase === "ban" ? "blueBans" : "bluePicks"
          : currentSlot.phase === "ban" ? "orangeBans" : "orangePicks";
      const arr = [...(next[key as keyof DraftState] as (string | null)[])];
      arr[currentSlot.index] = name;
      (next as any)[key] = arr;
      return next;
    });
    setStep((s) => s + 1);
  }

  function reset() {
    setState(INITIAL);
    setStep(0);
    setStarted(false);
    setQuery("");
    setRoleFilter("all");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-5xl tracking-wider">
            DRAFT <span className="text-gold">SIMULATOR</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            Treine pick & ban no formato competitivo
          </p>
        </div>

        <div className="flex gap-2">
          {!started ? (
            <Button
              size="lg"
              onClick={() => setStarted(true)}
              className="bg-gradient-primary shadow-glow uppercase tracking-wider"
            >
              <Play className="mr-2 h-4 w-4" /> Iniciar Draft
            </Button>
          ) : (
            <Button
              size="lg"
              variant="outline"
              onClick={reset}
              className="uppercase tracking-wider"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar
            </Button>
          )}
        </div>
      </div>

      {/* Status bar */}
      <StatusBar started={started} finished={finished} currentSlot={currentSlot} step={step} total={DRAFT_ORDER.length} />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2.5fr)_minmax(0,1fr)] gap-6 items-start">
        {/* Blue side */}
        <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <TeamPanel side="blue" state={state} currentSlot={currentSlot} />
        </div>

        {/* Pokémon Pool */}
        <div className="space-y-3 order-first lg:order-none lg:sticky lg:top-4 lg:self-start">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar Pokémon..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
                disabled={!started || finished}
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(v) => setRoleFilter(v as UniteRole | "all")}
              disabled={!started || finished}
            >
              <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_FILTERS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "all" ? "Todas as funções" : UNITE_ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={cn(
            "rounded-lg border border-border/40 bg-background/30 p-2",
            "lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto",
          )}>
            <div className={cn(
              "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-7 gap-2",
              (!started || finished) && "opacity-50 pointer-events-none",
            )}>
              {filtered.map((p) => {
                const isUsed = used.has(p.name);
                const style = UNITE_ROLE_STYLES[p.role];
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => selectPokemon(p.name)}
                    disabled={isUsed}
                    style={{ contentVisibility: "auto", containIntrinsicSize: "80px" }}
                    className={cn(
                      "group relative flex flex-col items-center gap-1 p-1.5 rounded-md border bg-card/50 transition-transform duration-150 will-change-transform",
                      isUsed
                        ? "opacity-30 grayscale cursor-not-allowed border-border"
                        : "border-transparent hover:bg-accent/30 hover:scale-[1.04] hover:border-primary/40 cursor-pointer",
                    )}
                  >
                    <div className="aspect-square w-full">
                      <PokemonImage name={p.name} withRoleBg />
                    </div>
                    <span className="font-display text-[10px] tracking-wider text-center leading-tight truncate w-full uppercase">
                      {p.name}
                    </span>
                    <span
                      className={cn(
                        "px-1 py-0.5 rounded text-[8px] uppercase tracking-widest font-display border w-full text-center truncate",
                        style.bg, style.ring, style.text,
                      )}
                    >
                      {UNITE_ROLE_LABEL[p.role]}
                    </span>
                    {isUsed && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Ban className="h-6 w-6 text-destructive" />
                      </div>
                    )}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-12 text-sm">
                  Nenhum Pokémon encontrado.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Orange side */}
        <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <TeamPanel side="orange" state={state} currentSlot={currentSlot} />
        </div>
      </div>
    </div>
  );
}

function StatusBar({
  started, finished, currentSlot, step, total,
}: {
  started: boolean; finished: boolean; currentSlot: Slot | null; step: number; total: number;
}) {
  if (!started) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 py-6 text-center">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          Clique em <span className="text-gold">Iniciar Draft</span> para começar a simulação
        </p>
      </div>
    );
  }
  if (finished) {
    return (
      <div className="rounded-lg border border-gold/40 bg-gradient-to-r from-gold/10 via-card to-gold/10 py-5 text-center shadow-glow">
        <div className="flex items-center justify-center gap-2 text-gold">
          <Trophy className="h-5 w-5" />
          <p className="font-display text-lg uppercase tracking-widest">Draft Concluído</p>
          <Trophy className="h-5 w-5" />
        </div>
      </div>
    );
  }
  if (!currentSlot) return null;
  const sideColor = currentSlot.side === "blue" ? "text-sky-300" : "text-orange-300";
  const sideName = currentSlot.side === "blue" ? "Time Azul" : "Time Laranja";
  const action = currentSlot.phase === "ban" ? "Ban" : "Pick";
  return (
    <div className={cn(
      "rounded-lg border bg-card/40 px-5 py-4 flex items-center justify-between flex-wrap gap-3",
      currentSlot.side === "blue" ? "border-sky-500/40" : "border-orange-500/40",
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "h-10 w-10 rounded-md flex items-center justify-center font-display text-lg",
          currentSlot.side === "blue" ? "bg-sky-500/20 text-sky-300" : "bg-orange-500/20 text-orange-300",
        )}>
          {currentSlot.phase === "ban" ? <Ban className="h-5 w-5" /> : "#" + (currentSlot.index + 1)}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Etapa atual</div>
          <div className={cn("font-display text-lg uppercase tracking-wider", sideColor)}>
            {sideName} — {action} {currentSlot.index + 1}
          </div>
        </div>
      </div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        Passo <span className="text-foreground">{step + 1}</span> / {total}
      </div>
    </div>
  );
}

function TeamPanel({
  side, state, currentSlot,
}: {
  side: Side; state: DraftState; currentSlot: Slot | null;
}) {
  const isBlue = side === "blue";
  const bans = isBlue ? state.blueBans : state.orangeBans;
  const picks = isBlue ? state.bluePicks : state.orangePicks;
  const accent = isBlue ? "sky" : "orange";
  const label = isBlue ? "Time Azul" : "Time Laranja";

  return (
    <div className={cn(
      "space-y-4 rounded-lg border bg-card/40 p-4",
      isBlue ? "border-sky-500/30" : "border-orange-500/30",
    )}>
      <div className="flex items-center justify-between">
        <div className={cn(
          "font-display text-sm uppercase tracking-widest",
          isBlue ? "text-sky-300" : "text-orange-300",
        )}>
          {label}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {isBlue ? "Blue Side" : "Orange Side"}
        </div>
      </div>

      {/* Bans */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Bans</div>
        <div className="grid grid-cols-3 gap-2">
          {bans.map((b, i) => {
            const isCurrent = currentSlot?.side === side && currentSlot.phase === "ban" && currentSlot.index === i;
            return (
              <SlotTile
                key={i}
                name={b}
                empty={<Ban className={cn("h-5 w-5", `text-${accent}-500/60`)} />}
                isCurrent={isCurrent}
                accent={accent}
                small
                muted
              />
            );
          })}
        </div>
      </div>

      {/* Picks */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Picks</div>
        <div className="space-y-2">
          {picks.map((p, i) => {
            const isCurrent = currentSlot?.side === side && currentSlot.phase === "pick" && currentSlot.index === i;
            return (
              <PickRow
                key={i}
                index={i}
                name={p}
                isCurrent={isCurrent}
                accent={accent}
                isBlue={isBlue}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SlotTile({
  name, empty, isCurrent, accent, small,
}: {
  name: string | null; empty: React.ReactNode; isCurrent: boolean; accent: string; small?: boolean; muted?: boolean;
}) {
  return (
    <motion.div
      animate={isCurrent ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={isCurrent ? { duration: 1.2, repeat: Infinity } : { duration: 0.2 }}
      className={cn(
        "relative aspect-square rounded-md border flex items-center justify-center overflow-hidden bg-background/40",
        isCurrent
          ? `border-${accent}-400 shadow-[0_0_18px_-2px_rgba(56,189,248,0.7)]`
          : "border-border/60",
      )}
    >
      <AnimatePresence mode="wait">
        {name ? (
          <motion.div
            key={name}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn("w-full h-full p-1", small && "grayscale opacity-60")}
          >
            <PokemonImage name={name} withRoleBg />
          </motion.div>
        ) : (
          <motion.div key="empty" className="text-muted-foreground">
            {empty}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PickRow({
  index, name, isCurrent, accent, isBlue,
}: {
  index: number; name: string | null; isCurrent: boolean; accent: string; isBlue: boolean;
}) {
  return (
    <motion.div
      animate={isCurrent ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={isCurrent ? { duration: 1.2, repeat: Infinity } : { duration: 0.2 }}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background/40 p-1.5",
        isCurrent
          ? `border-${accent}-400 shadow-[0_0_18px_-2px_rgba(56,189,248,0.7)]`
          : "border-border/60",
        !isBlue && "flex-row-reverse",
      )}
    >
      <div className="h-12 w-12 shrink-0">
        {name ? (
          <PokemonImage name={name} withRoleBg />
        ) : (
          <div className={cn(
            "h-full w-full rounded border border-dashed flex items-center justify-center text-[10px] font-display text-muted-foreground",
            isBlue ? "border-sky-500/30" : "border-orange-500/30",
          )}>
            #{index + 1}
          </div>
        )}
      </div>
      <div className={cn("flex-1 min-w-0", !isBlue && "text-right")}>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Pick {index + 1}
        </div>
        <div className="font-display text-sm truncate uppercase tracking-wider">
          {name ?? "—"}
        </div>
      </div>
    </motion.div>
  );
}
