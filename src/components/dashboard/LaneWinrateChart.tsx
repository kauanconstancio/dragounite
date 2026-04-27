import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Row = {
  role: string;
  label: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
};

export function LaneWinrateChart({ data }: { data: Row[] }) {
  if (!data.length) {
    return <div className="text-sm text-muted-foreground py-10 text-center">Sem dados suficientes.</div>;
  }
  return (
    <div className="space-y-3">
      {data.map((r) => {
        const decided = r.wins + r.losses;
        const positive = r.winrate >= 50;
        return (
          <div key={r.role} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{r.label}</span>
                <Badge variant="outline" className="border-border text-[10px] uppercase tracking-wider">
                  {r.games} {r.games === 1 ? "jogo" : "jogos"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {r.wins}V · {r.losses}D
                </span>
                <span
                  className={cn(
                    "font-display text-lg tabular-nums",
                    decided === 0 ? "text-muted-foreground" : positive ? "text-gold" : "text-destructive",
                  )}
                >
                  {decided === 0 ? "—" : `${r.winrate}%`}
                </span>
              </div>
            </div>
            <Progress
              value={decided === 0 ? 0 : r.winrate}
              className={cn(
                "h-2",
                decided === 0
                  ? "[&>div]:bg-muted"
                  : positive
                    ? "[&>div]:bg-gold"
                    : "[&>div]:bg-destructive",
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
