import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MousePointer2, Pencil, Type, RotateCcw, Trash2, Eraser, Move } from "lucide-react";
import { POKEMON_DATA, UNITE_ROLE_LABEL, UNITE_ROLE_STYLES, type UniteRole } from "@/lib/pokemon";
import { PokemonImage } from "@/components/PokemonImage";
import { cn } from "@/lib/utils";
import mapRayquaza from "@/assets/map-rayquaza.jpg";
import mapGroudon from "@/assets/map-groudon.jpg";
import mapKyogre from "@/assets/map-kyogre.jpg";

type MapId = "rayquaza" | "groudon" | "kyogre";
const MAPS: { id: MapId; label: string; image: string }[] = [
  { id: "rayquaza", label: "Theia Sky Ruins · Rayquaza", image: mapRayquaza },
  { id: "groudon", label: "Theia Sky Ruins · Groudon", image: mapGroudon },
  { id: "kyogre", label: "Theia Sky Ruins · Kyogre", image: mapKyogre },
];

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Planner — Battle Arena" },
      { name: "description", content: "Planeje estratégias arrastando Pokémons no mapa de Theia Sky Ruins." },
      { property: "og:title", content: "Planner — Battle Arena" },
      { property: "og:description", content: "Ferramenta interativa de planejamento tático no mapa do Pokémon Unite." },
    ],
  }),
  component: PlannerPage,
});

type Tool = "select" | "draw-red" | "draw-blue" | "draw-yellow" | "text" | "erase";
type Token = { id: string; pokemon: string; x: number; y: number };
type Stroke = { id: string; color: string; points: { x: number; y: number }[] };
type TextNote = { id: string; x: number; y: number; text: string };

const ROLE_FILTERS: (UniteRole | "all")[] = ["all", "attacker", "speedster", "all-rounder", "defender", "supporter"];

const TOOL_COLORS: Record<string, string> = {
  "draw-red": "#ef4444",
  "draw-blue": "#3b82f6",
  "draw-yellow": "#eab308",
};

function PlannerPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [notes, setNotes] = useState<TextNote[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UniteRole | "all">("all");
  const [drawing, setDrawing] = useState<Stroke | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [mapId, setMapId] = useState<MapId>("rayquaza");
  const mapRef = useRef<HTMLDivElement>(null);
  const currentMap = MAPS.find((m) => m.id === mapId)!;

  const filtered = useMemo(
    () =>
      POKEMON_DATA.filter((p) => {
        if (roleFilter !== "all" && p.role !== roleFilter) return false;
        return p.name.toLowerCase().includes(query.toLowerCase().trim());
      }),
    [query, roleFilter],
  );

  function getRelativeCoords(e: React.MouseEvent | React.PointerEvent) {
    const rect = mapRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }

  function handleMapPointerDown(e: React.PointerEvent) {
    if (tool === "select") return;
    const pt = getRelativeCoords(e);

    if (tool === "text") {
      const text = window.prompt("Anotação:");
      if (text?.trim()) {
        setNotes((n) => [...n, { id: crypto.randomUUID(), x: pt.x, y: pt.y, text: text.trim() }]);
      }
      return;
    }

    if (tool === "erase") {
      // Apaga o stroke/nota mais próximo do ponto
      setStrokes((s) =>
        s.filter(
          (st) =>
            !st.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 3),
        ),
      );
      setNotes((n) => n.filter((nt) => Math.hypot(nt.x - pt.x, nt.y - pt.y) > 4));
      return;
    }

    // drawing
    const color = TOOL_COLORS[tool];
    setDrawing({ id: crypto.randomUUID(), color, points: [pt] });
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function handleMapPointerMove(e: React.PointerEvent) {
    if (!drawing) return;
    const pt = getRelativeCoords(e);
    setDrawing({ ...drawing, points: [...drawing.points, pt] });
  }

  function handleMapPointerUp() {
    if (drawing) {
      setStrokes((s) => [...s, drawing]);
      setDrawing(null);
    }
  }

  function addToken(name: string) {
    setTokens((t) => [
      ...t,
      { id: crypto.randomUUID(), pokemon: name, x: 50, y: 50 },
    ]);
  }

  function startDragToken(id: string) {
    if (tool !== "select") return;
    setDraggingId(id);
  }

  function handleTokenMove(e: React.PointerEvent) {
    if (!draggingId) return;
    const pt = getRelativeCoords(e);
    setTokens((ts) => ts.map((t) => (t.id === draggingId ? { ...t, x: pt.x, y: pt.y } : t)));
  }

  function endDragToken() {
    setDraggingId(null);
  }

  function removeToken(id: string) {
    setTokens((ts) => ts.filter((t) => t.id !== id));
  }

  function clearAll() {
    setTokens([]);
    setStrokes([]);
    setNotes([]);
    setDrawing(null);
  }

  function undoLast() {
    if (notes.length) {
      setNotes((n) => n.slice(0, -1));
    } else if (strokes.length) {
      setStrokes((s) => s.slice(0, -1));
    } else if (tokens.length) {
      setTokens((t) => t.slice(0, -1));
    }
  }

  const tools: { key: Tool; icon: typeof MousePointer2; label: string; color?: string }[] = [
    { key: "select", icon: MousePointer2, label: "Selecionar / Mover" },
    { key: "draw-red", icon: Pencil, label: "Desenhar (vermelho)", color: "bg-red-500/80 text-white border-red-400" },
    { key: "draw-blue", icon: Pencil, label: "Desenhar (azul)", color: "bg-sky-500/80 text-white border-sky-400" },
    { key: "draw-yellow", icon: Pencil, label: "Desenhar (amarelo)", color: "bg-yellow-500/80 text-black border-yellow-400" },
    { key: "text", icon: Type, label: "Adicionar texto" },
    { key: "erase", icon: Eraser, label: "Apagar" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="font-display text-5xl tracking-wider">
          BATTLE <span className="text-gold">PLANNER</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto leading-relaxed">
          Ferramenta interativa de planejamento estratégico. Arraste Pokémons para o mapa,
          desenhe rotações, adicione anotações e organize táticas para suas partidas.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Move className="h-4 w-4" />
            <span>Mapa: <span className="text-foreground">Theia Sky Ruins</span></span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={undoLast} className="uppercase tracking-wider">
              <RotateCcw className="mr-2 h-3.5 w-3.5" /> Desfazer
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll} className="uppercase tracking-wider hover:text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Limpar
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          {/* Toolbar lateral */}
          <div className="flex flex-col gap-2 shrink-0">
            {tools.map(({ key, icon: Icon, label, color }) => {
              const active = tool === key;
              return (
                <button
                  key={key}
                  type="button"
                  title={label}
                  onClick={() => setTool(key)}
                  className={cn(
                    "h-10 w-10 rounded-full border flex items-center justify-center transition-all",
                    active
                      ? color ?? "bg-primary text-primary-foreground border-primary shadow-glow"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          {/* Mapa */}
          <div
            ref={mapRef}
            className={cn(
              "relative flex-1 rounded-lg overflow-hidden border border-border bg-background select-none",
              tool === "select" ? "cursor-default" : tool === "erase" ? "cursor-cell" : "cursor-crosshair",
            )}
            style={{ aspectRatio: "16 / 9" }}
            onPointerDown={handleMapPointerDown}
            onPointerMove={(e) => {
              handleMapPointerMove(e);
              handleTokenMove(e);
            }}
            onPointerUp={() => {
              handleMapPointerUp();
              endDragToken();
            }}
            onPointerLeave={() => {
              handleMapPointerUp();
              endDragToken();
            }}
          >
            <img
              src={mapImage}
              alt="Mapa Pokémon Unite"
              draggable={false}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />

            {/* SVG layer para desenhos */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {strokes.map((s) => (
                <polyline
                  key={s.id}
                  points={s.points.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={0.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ filter: `drop-shadow(0 0 2px ${s.color})` }}
                />
              ))}
              {drawing && (
                <polyline
                  points={drawing.points.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke={drawing.color}
                  strokeWidth={0.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            {/* Anotações de texto */}
            {notes.map((n) => (
              <div
                key={n.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded bg-background/90 border border-gold/60 text-gold font-display text-xs uppercase tracking-widest shadow-glow whitespace-nowrap pointer-events-none"
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
              >
                {n.text}
              </div>
            ))}

            {/* Tokens (Pokémons) */}
            {tokens.map((t) => (
              <div
                key={t.id}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  startDragToken(t.id);
                  (e.currentTarget as Element).setPointerCapture(e.pointerId);
                }}
                onDoubleClick={() => removeToken(t.id)}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 h-12 w-12 cursor-grab active:cursor-grabbing transition-transform",
                  draggingId === t.id && "scale-110 z-10",
                )}
                style={{ left: `${t.x}%`, top: `${t.y}%` }}
                title={`${t.pokemon} (duplo clique para remover)`}
              >
                <PokemonImage name={t.pokemon} withRoleBg />
              </div>
            ))}

            {tokens.length === 0 && strokes.length === 0 && notes.length === 0 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-background/80 border border-border text-[10px] uppercase tracking-widest text-muted-foreground pointer-events-none">
                Clique em um Pokémon abaixo para adicionar ao mapa
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pool de Pokémons */}
      <div className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar Pokémon..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UniteRole | "all")}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLE_FILTERS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r === "all" ? "Todas as funções" : UNITE_ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {filtered.map((p) => {
            const style = UNITE_ROLE_STYLES[p.role];
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => addToken(p.name)}
                className="group shrink-0 w-16 flex flex-col items-center gap-1 p-1 rounded-md border border-transparent hover:bg-accent/30 hover:border-primary/40 transition-all"
                title={`Adicionar ${p.name} ao mapa`}
              >
                <div className="h-12 w-12 group-hover:scale-110 transition-transform">
                  <PokemonImage name={p.name} withRoleBg />
                </div>
                <span className={cn("text-[8px] uppercase tracking-widest font-display truncate w-full text-center", style.text)}>
                  {p.name.split(" ")[0]}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center text-muted-foreground py-6 text-sm w-full">
              Nenhum Pokémon encontrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
