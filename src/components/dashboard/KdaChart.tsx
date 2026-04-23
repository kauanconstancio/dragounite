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
      <AreaChart data={data} margin={{ top: 24, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="kdaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
        <XAxis
          dataKey="label"
          stroke="var(--muted-foreground)"
          fontSize={12}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            color: "var(--foreground)",
          }}
          labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
          formatter={(value) => [Number(value).toFixed(2), "KDA"]}
        />
        <Area
          type="monotone"
          dataKey="kda"
          stroke="var(--primary)"
          strokeWidth={2.5}
          fill="url(#kdaFill)"
          dot={{ r: 4, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }}
          isAnimationActive={true}
        >
          <LabelList
            dataKey="kda"
            position="top"
            fill="var(--foreground)"
            fontSize={11}
            fontWeight={600}
            formatter={(value) => Number(value).toFixed(1)}
          />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}
