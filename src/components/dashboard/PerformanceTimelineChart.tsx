import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type Datum = {
  label: string;
  score: number;
  damage: number;
  opponent: string;
  result: string;
  pokemon: string;
};

const RESULT_LABEL: Record<string, string> = {
  win: "Vitória",
  loss: "Derrota",
  draw: "Empate",
  pending: "Pendente",
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as Datum;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <div className="font-medium text-foreground mb-1">vs {d.opponent}</div>
      <div className="text-muted-foreground">{d.pokemon} · {RESULT_LABEL[d.result] ?? d.result}</div>
      <div className="mt-1 flex gap-3">
        <span className="text-primary">Score: {d.score.toLocaleString()}</span>
        <span className="text-gold">Dano: {d.damage.toLocaleString()}</span>
      </div>
    </div>
  );
}

export function PerformanceTimelineChart({ data }: { data: Datum[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
        <XAxis
          dataKey="label"
          stroke="var(--muted-foreground)"
          fontSize={12}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          yAxisId="left"
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
        <Bar
          yAxisId="left"
          dataKey="score"
          name="Score"
          fill="var(--primary)"
          radius={[4, 4, 0, 0]}
          opacity={0.85}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="damage"
          name="Dano causado"
          stroke="var(--gold)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "var(--gold)", stroke: "var(--background)", strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
