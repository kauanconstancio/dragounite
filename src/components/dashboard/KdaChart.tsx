import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function KdaChart({
  data,
}: {
  data: { label: string; kills: number; assists: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 24, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="killsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="assistsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity={0.02} />
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
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="circle"
        />
        <Area
          type="monotone"
          dataKey="kills"
          name="Kills"
          stroke="var(--primary)"
          strokeWidth={2.5}
          fill="url(#killsFill)"
          dot={{ r: 4, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }}
          isAnimationActive={true}
        />
        <Area
          type="monotone"
          dataKey="assists"
          name="Assists"
          stroke="var(--gold)"
          strokeWidth={2.5}
          fill="url(#assistsFill)"
          dot={{ r: 4, fill: "var(--gold)", stroke: "var(--background)", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "var(--gold)", stroke: "var(--background)", strokeWidth: 2 }}
          isAnimationActive={true}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
