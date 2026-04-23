
## Adicionar KPIs de Win-rate (Scrims e Partidas) no Dashboard

Atualmente o card "Winrate geral" do dashboard mostra apenas o resultado consolidado de scrims (uma linha por scrim em `scrims.result`). Vamos separar em duas métricas distintas:

1. **Winrate de Scrims** — baseado em `scrims.result` (resultado final do confronto best-of-N).
2. **Winrate de Partidas** — baseado em cada game individual registrado em `match_performances.result`, contando cada partida como uma vitória/derrota.

### Mudanças

**`src/lib/stats.ts`**
- Adicionar nova função `computeMatchWinrate(perfs)` que recebe linhas de `match_performances` e calcula `{ rate, wins, losses, total }`. Como cada game tem múltiplas performances (uma por jogador), agrupar por `scrim_id + game_number` e contar cada game único uma vez (usando o `result` que é o mesmo para todos os jogadores daquele game).

**`src/routes/index.tsx`**
- Adicionar nova `useQuery` buscando `match_performances` (campos: `scrim_id, game_number, result`).
- Renomear o KPI atual "Winrate geral" para **"Winrate Scrims"** (mantém lógica existente baseada em `scrims`).
- Adicionar novo KPI **"Winrate Partidas"** usando `computeMatchWinrate`, com hint mostrando `XV · YD em Z partidas`.
- Reorganizar grid de KPIs: passar de `grid-cols-2 lg:grid-cols-4` para `grid-cols-2 lg:grid-cols-5` para acomodar os 5 cards (Winrate Scrims, Winrate Partidas, Streak, Treinos no mês, Roster ativo).

### Detalhes técnicos

- A query busca apenas `scrim_id, game_number, result` de `match_performances` para minimizar payload.
- Deduplicação por chave `${scrim_id}:${game_number}` antes de contar wins/losses (ignora `pending` e `draw` no cálculo de taxa, igual ao comportamento atual de scrims).
- Ícone do novo KPI: `Swords` (lucide-react, já importado) com accent `gold` para diferenciar do "Winrate Scrims" que mantém `Trophy`/`gold`. Para evitar dois cards dourados lado a lado, mudar accent do novo card para `primary`.

### Arquivos editados
- `src/lib/stats.ts`
- `src/routes/index.tsx`
