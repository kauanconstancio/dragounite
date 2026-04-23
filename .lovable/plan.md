
## Radar Chart de Performance do Time no Dashboard

Substituir o gráfico atual de "Partidas Ganhas vs Total" por um **Radar Chart** que mostra um panorama completo da performance do time em múltiplas dimensões normalizadas (0-100).

### Eixos do radar (6 métricas)

1. **Winrate Scrims** — % de scrims ganhas (já calculado).
2. **Winrate Partidas** — % de games individuais ganhos (já calculado).
3. **KDA médio** — KDA agregado de todas as `match_performances`, normalizado (KDA 5.0+ = 100).
4. **Dano médio** — média de `damage_dealt` por partida, normalizado por máximo histórico.
5. **MVP rate** — % de partidas com pelo menos um MVP do time.
6. **Atividade** — partidas finalizadas nos últimos 30 dias, normalizado (10+ scrims = 100).

Cada eixo vai de 0 a 100 para manter escala consistente. Tooltip mostra o valor real (ex: "KDA: 3.42", "Dano médio: 78.500").

### Mudanças

**`src/lib/stats.ts`**
- Adicionar `computeTeamRadar(scrims, perfs)` que retorna `{ axis: string; value: number; raw: string }[]` com os 6 eixos normalizados.

**`src/components/dashboard/TeamRadarChart.tsx`** (novo)
- Componente usando `RadarChart`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis` e `Radar` do Recharts.
- Cores: `var(--primary)` (azul) para preenchimento da área com opacidade ~0.4, stroke `var(--gold)`.
- Tooltip customizado mostrando o valor bruto (raw) ao invés do normalizado.
- Estado vazio: mensagem "Sem dados suficientes para gerar radar".

**`src/routes/index.tsx`**
- Substituir importação de `WinrateChart` por `TeamRadarChart`.
- Atualizar `useMemo` do `chartData` para chamar `computeTeamRadar(scrims, matchPerfs)`.
- Atualizar título do card para **"Visão Geral do Time"** com subtítulo "6 dimensões de performance".

### Detalhes técnicos

- Normalizações:
  - Winrates: já em 0-100.
  - KDA: `min(kda / 5 * 100, 100)`.
  - Dano: `min(avgDmg / 100000 * 100, 100)` (referência ~100k de dano por partida = topo).
  - MVP rate: `(games_with_mvp / total_games) * 100`.
  - Atividade: `min(scrims_30d / 10 * 100, 100)`.
- `matchPerfs` precisa ser estendido para incluir `kills, deaths, assists, damage_dealt, is_mvp` — atualizar a query em `index.tsx` para selecionar esses campos adicionais.
- Reutilizar tipo `PerfRow` de `src/lib/player-stats.ts` ou criar um tipo local mais leve em `stats.ts`.

### Arquivos editados
- `src/lib/stats.ts`
- `src/components/dashboard/TeamRadarChart.tsx` (novo)
- `src/routes/index.tsx`
