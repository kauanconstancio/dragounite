import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";

type Props = {
  scrimWr: { rate: number; wins: number; losses: number; total: number };
  matchWr: { rate: number; wins: number; losses: number; total: number };
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {p.label}
      </div>
      <div className="font-display text-sm text-gold tracking-wider">
        {p.rate}%
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">
        {p.wins}V · {p.losses}D em {p.total}
      </div>
    </div>
  );
}

export function WinrateBarChart({ scrimWr, matchWr }: Props) {
  const data = [
    {
      label: "Scrims",
      rate: scrimWr.rate,
      wins: scrimWr.wins,
      losses: scrimWr.losses,
      total: scrimWr.total,
    },
    {
      label: "Partidas",
      rate: matchWr.rate,
      wins: matchWr.wins,
      losses: matchWr.losses,
      total: matchWr.total,
    },
  ];

  const hasData = scrimWr.total > 0 || matchWr.total > 0;

  if (!hasData) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
        Sem dados suficientes.
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 11,
              letterSpacing: "0.1em",
            }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            stroke="hsl(var(--border))"
            tickCount={6}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.1 }} />
          <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={80}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={idx === 0 ? "var(--gold)" : "hsl(var(--primary))"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
