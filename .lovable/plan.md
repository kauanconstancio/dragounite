
## Contexto

A rota `src/routes/jogadores.$memberId.tsx` já existe com base sólida: header do jogador, KPIs (kills/assists/MVPs/jogos/score/dano), KDA timeline e top pokémon com win rate. Falta atender o pedido completo: **win rate por lane** e **gráficos das últimas scrims** (resultado + KDA por partida com contexto).

Também vou aproveitar pra dar mais profundidade analítica e tornar a página realmente um "dashboard de jogador".

## Mudanças

### 1. `src/lib/player-stats.ts` — novas funções de agregação

Adicionar funções utilitárias (sem refatorar as existentes):

- **`winRateByLane(perfs, laneByPokemon)`** — agrupa partidas por lane (inferida do pokémon via `LANE_LABEL`/mapa) e devolve `[{ lane, games, wins, losses, winrate }]`. Como `match_performances` não tem lane direta, vou inferir pelo pokémon usando o catálogo de `src/lib/pokemon.ts`.
- **`recentScrimsBreakdown(perfs, scrimMap, limit = 10)`** — para as últimas N scrims do jogador, retorna `[{ date, opponent, result, kda, kills, deaths, assists, score, pokemon, isMvp }]` ordenado por data desc, pronto pra tabela + gráfico.
- **`scoreAndDamageTimeline(perfs, dateMap)`** — série temporal `[{ label, score, damage }]` pra um segundo gráfico (área dupla normalizada ou eixos separados).
- **`mvpRate(perfs)`** — `{ rate: %, mvps, games }`.

### 2. `src/components/dashboard/PerformanceTimelineChart.tsx` — novo gráfico

ComposedChart do recharts: barras de `score` + linha de `damage`, com tooltip mostrando oponente e resultado da scrim. Estilizado igual ao `KdaChart` (gradientes, cores de tema, `var(--primary)` / `var(--gold)`).

### 3. `src/components/dashboard/LaneWinrateChart.tsx` — novo gráfico

BarChart horizontal com win rate (%) por lane, cor condicional (gold ≥ 50%, destructive < 50%), label com `wins-losses` ao lado.

### 4. `src/routes/jogadores.$memberId.tsx` — expansão da página

Adicionar quatro seções (mantendo o que já existe):

- **Win rate por lane** (card lado a lado com top pokémon, ou linha nova): renderiza `LaneWinrateChart`. Vazio mostra "sem dados suficientes".
- **Performance ao longo do tempo** (card full-width): `PerformanceTimelineChart` com score+damage. Complementa o KDA timeline existente.
- **Últimas scrims** (card full-width, novo bloco abaixo): tabela compacta com data, oponente, resultado (badge V/D), pokémon (com `PokemonImage`), K/D/A, KDA, score, MVP (ícone Star). Limita a 10. Cada linha clicável → `/amistosos` (ou apenas exibe; manter simples por enquanto).
- **KPIs adicionais**: somar dois cards na grid existente — **MVP rate %** e **KDA médio**.

Buscar `members` (todos da equipe) só é desnecessário; mantemos a query de `scrims` que já traz `result` e `opponent`. Construir `scrimMap` enriquecido `Map<scrim_id, { date, opponent, result }>` em vez de só date+result separados.

### 5. Link de entrada

Verificar `src/routes/roster.tsx` — se cada card de membro já não linka pra `/jogadores/$memberId`, adicionar `<Link to="/jogadores/$memberId" params={{ memberId: m.id }}>` envolvendo o card. (Vou checar na implementação; se já existir, não toco.)

### 6. Inferência de lane

Como `members.lane` existe mas as partidas em si não têm lane, vou usar duas estratégias combinadas:
- Se o pokémon jogado mapeia pra uma lane única no catálogo (`src/lib/pokemon.ts` tem `POKEMON_LANE` ou similar), usar essa.
- Fallback: se o jogador tem `member.lane` definido, usar essa pra partidas sem mapeamento.

Vou inspecionar `src/lib/pokemon.ts` na implementação pra confirmar o helper exato disponível.

## Arquivos afetados

- ✏️ `src/lib/player-stats.ts` (adicionar funções, sem quebrar existentes)
- 🆕 `src/components/dashboard/PerformanceTimelineChart.tsx`
- 🆕 `src/components/dashboard/LaneWinrateChart.tsx`
- ✏️ `src/routes/jogadores.$memberId.tsx` (expandir layout)
- ✏️ `src/routes/roster.tsx` (garantir link, se faltar)

## Não vou fazer (fora de escopo)

- Comparador entre jogadores (sugestão #2 da lista anterior — pede outra rota).
- Filtros por período (últimas 7 / 30 / 90 dias) — posso adicionar depois se quiser.
- Export PDF da página de jogador.

Quer que eu inclua algum desses extras antes de começar?
