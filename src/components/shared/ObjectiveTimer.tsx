import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, Play, Pause, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Preset = { label: string; seconds: number; color: string };
const PRESETS: Preset[] = [
  { label: "Regis (7:00)", seconds: 7 * 60, color: "text-sky-300" },
  { label: "Rayquaza (2:00)", seconds: 2 * 60, color: "text-gold" },
  { label: "Evolução (9:30)", seconds: 9 * 60 + 30, color: "text-emerald-300" },
  { label: "Buff Jungle (1:00)", seconds: 60, color: "text-purple-300" },
];

function format(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export function ObjectiveTimer() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Preset | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = window.setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            beep();
            setRunning(false);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, remaining]);

  function beep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.2;
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 600);
    } catch {}
  }

  function start(p: Preset) {
    setActive(p);
    setRemaining(p.seconds);
    setRunning(true);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-3 shadow-glow text-primary-foreground font-display uppercase tracking-wider text-xs hover:scale-105 transition-transform"
        >
          <Timer className="h-4 w-4" /> Timer
        </button>
      )}
      {open && (
        <Card className="fixed bottom-6 right-6 z-30 w-72 p-4 border-gold/40 shadow-glow bg-card/95 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-display tracking-wider text-sm">
              <Timer className="h-4 w-4 text-gold" /> Objetivos
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {active && (
            <div className="mb-3 text-center">
              <div className={cn("font-display text-5xl tabular-nums", active.color)}>
                {format(remaining)}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                {active.label}
              </div>
              <div className="flex justify-center gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => setRunning((r) => !r)} disabled={remaining === 0}>
                  {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setRemaining(active.seconds); setRunning(true); }}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => start(p)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-md border border-border hover:border-primary/50 text-xs flex items-center justify-between transition-colors",
                  active?.label === p.label && "border-gold/60 bg-gold/10",
                )}
              >
                <span className="uppercase tracking-wider">{p.label}</span>
                <span className={cn("font-display", p.color)}>{format(p.seconds)}</span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
