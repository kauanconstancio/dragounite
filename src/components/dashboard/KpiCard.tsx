import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  Icon: LucideIcon;
  accent?: "primary" | "gold" | "emerald" | "destructive";
};

const ACCENT: Record<string, string> = {
  primary: "text-primary",
  gold: "text-gold",
  emerald: "text-emerald-400",
  destructive: "text-destructive",
};

export function KpiCard({ label, value, hint, Icon, accent = "primary" }: Props) {
  return (
    <Card className="p-3 sm:p-5 border-border shadow-card bg-card/70">
      <div className="flex items-start justify-between gap-2 sm:gap-3 min-w-0">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">{label}</div>
          <div className={cn("font-display text-2xl sm:text-4xl mt-1 leading-none truncate", ACCENT[accent])}>{value}</div>
          {hint && <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-2 line-clamp-2">{hint}</div>}
        </div>
        <Icon className={cn("h-5 w-5 sm:h-7 sm:w-7 opacity-60 shrink-0", ACCENT[accent])} />
      </div>
    </Card>
  );
}
