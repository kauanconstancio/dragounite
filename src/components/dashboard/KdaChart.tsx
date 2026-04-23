import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

export function KdaChart({ data }: { data: { label: string; kda: number; score: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="kdaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity={0.5} />
            <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
        <XAxis
          dataKey="label"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
          labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
          formatter={(value: number) => [value.toFixed(2), "KDA"]}
        />
        <Area
          type="monotone"
          dataKey="kda"
          stroke="hsl(var(--gold))"
          strokeWidth={2.5}
          fill="url(#kdaFill)"
          dot={{ r: 4, fill: "hsl(var(--gold))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "hsl(var(--gold))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
          isAnimationActive={true}
        >
          <LabelList
            dataKey="kda"
            position="top"
            fill="hsl(var(--foreground))"
            fontSize={11}
            fontWeight={600}
            formatter={(value: number) => value.toFixed(1)}
          />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}
