import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { label: string; opponent: string; winrate: number };

export function WinrateChart({ data }: { data: Point[] }) {
  if (!data.length) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
        Sem partidas finalizadas para gerar gráfico.
      </div>
    );
  }
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="wrFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.83 0.16 85)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="oklch(0.83 0.16 85)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" stroke="oklch(0.7 0.01 90)" fontSize={11} />
          <YAxis domain={[0, 100]} stroke="oklch(0.7 0.01 90)" fontSize={11} unit="%" />
          <Tooltip
            contentStyle={{
              background: "oklch(0.17 0.008 25)",
              border: "1px solid oklch(0.27 0.015 25)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: any) => [`${value}%`, "Winrate"]}
            labelFormatter={(_, p: any) => p?.[0]?.payload?.opponent ?? ""}
          />
          <Area
            type="monotone"
            dataKey="winrate"
            stroke="oklch(0.83 0.16 85)"
            strokeWidth={2}
            fill="url(#wrFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
