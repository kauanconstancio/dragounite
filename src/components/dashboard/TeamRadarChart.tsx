import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { RadarAxis } from "@/lib/stats";

type Props = { data: RadarAxis[] };

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as RadarAxis;
  return (
    <div className="rounded-md border border-border bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {p.axis}
      </div>
      <div className="font-display text-sm text-gold tracking-wider">{p.raw}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">
        Score: {p.value}/100
      </div>
    </div>
  );
}

export function TeamRadarChart({ data }: Props) {
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
        Sem dados suficientes para gerar radar.
      </div>
    );
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 11,
              letterSpacing: "0.1em",
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
            stroke="hsl(var(--border))"
            tickCount={5}
          />
          <Radar
            name="Time"
            dataKey="value"
            stroke="var(--gold)"
            strokeWidth={2}
            fill="hsl(var(--primary))"
            fillOpacity={0.4}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
