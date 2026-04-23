import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

type Point = { label: string; opponent: string; wins: number; total: number };

export function WinrateChart({ data }: { data: Point[] }) {
  if (!data.length) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
        Sem partidas finalizadas para gerar gráfico.
      </div>
    );
  }
  const maxY = Math.max(5, ...data.map((d) => d.total));
  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="totalFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.65 0.18 250)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="oklch(0.65 0.18 250)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="winsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.83 0.16 85)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="oklch(0.83 0.16 85)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" stroke="oklch(0.7 0.01 90)" fontSize={11} />
          <YAxis
            domain={[0, maxY]}
            allowDecimals={false}
            stroke="oklch(0.7 0.01 90)"
            fontSize={11}
          />
          <Tooltip
            contentStyle={{
              background: "oklch(0.17 0.008 25)",
              border: "1px solid oklch(0.27 0.015 25)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: any, name: any) => [value, name]}
            labelFormatter={(_, p: any) => p?.[0]?.payload?.opponent ?? ""}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
          <Area
            type="monotone"
            dataKey="total"
            name="Total de partidas"
            stroke="oklch(0.65 0.18 250)"
            strokeWidth={2}
            fill="url(#totalFill)"
          />
          <Area
            type="monotone"
            dataKey="wins"
            name="Partidas ganhas"
            stroke="oklch(0.83 0.16 85)"
            strokeWidth={2}
            fill="url(#winsFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
