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
    <Card className="p-5 border-border shadow-card bg-card/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className={cn("font-display text-4xl mt-1 leading-none", ACCENT[accent])}>{value}</div>
          {hint && <div className="text-[11px] text-muted-foreground mt-2">{hint}</div>}
        </div>
        <Icon className={cn("h-7 w-7 opacity-60", ACCENT[accent])} />
      </div>
    </Card>
  );
}
