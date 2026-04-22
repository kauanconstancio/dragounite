

# Plano: Expansão completa do Battle Arena

Vou implementar as funcionalidades em **5 fases sequenciais**, cada uma entregando valor independente. Todas usam o backend Lovable Cloud já existente, com novas tabelas + RLS pública (mantendo o padrão atual do projeto).

---

## Fase 1 — Dashboard & Estatísticas (base analítica)

**Nova rota `/` (Dashboard)** substitui o Roster como home. Roster move para `/roster`.

- **KPIs principais**: winrate geral, scrims do mês, treinos do mês, streak atual (W/L), próximo evento.
- **Gráfico de winrate**: últimos 10 amistosos (linha + área, usando `recharts` já instalado via shadcn/chart).
- **Próximos eventos**: cards com os próximos 3 treinos/scrims.
- **Comp mais usada / Top Pokémon**: agregados das tabelas existentes.
- Atualiza `AppLayout` com novo item "Dashboard".

---

## Fase 2 — Scouting de Adversários + VOD Review

**Nova tabela `opponents`**: nome, tag, região, notas, picks recorrentes (text[]), jogadores conhecidos (jsonb).
**Nova coluna em `scrims`**: `opponent_id` (FK opcional para `opponents`), `vod_url`, `vod_notes`.

**Novas rotas:**
- `/oponentes` — lista + ficha individual com histórico de confrontos (winrate vs cada time, últimas partidas, picks repetidos).
- `/oponentes/$id` — detalhes do adversário.

**Melhorias em `/amistosos`:**
- Selector de oponente (autocomplete) em vez de texto livre.
- Campo VOD (link YouTube/Drive) + notas com timestamps.
- Mini-player embed quando link YouTube.

---

## Fase 3 — RSVP, Disponibilidade & Mural

**Nova tabela `attendance`**: `event_id`, `event_type` ('training'|'scrim'), `member_id`, `status` ('confirmed'|'declined'|'tentative'), `note`.
**Nova tabela `announcements`**: `title`, `body`, `pinned`, `created_at`, `author_member_id`.

**Funcionalidades:**
- Em `/agenda`: cada evento mostra avatares dos confirmados + botões Confirmar/Recusar/Talvez por jogador (selector de quem está respondendo, já que não há auth).
- Indicador visual de quórum (5/5 confirmados → verde).
- Nova rota `/mural` — feed de avisos do coach, posts fixáveis, ordenados por data.
- Card de "Avisos recentes" no Dashboard.

---

## Fase 4 — Build Guides + Biblioteca de Jogadas + Tier List

**Nova tabela `builds`**: `pokemon`, `items` (jsonb: 3 hold items), `battle_item`, `emblems` (text), `moveset` (jsonb: move1/move2), `notes`, `created_by`.
**Nova tabela `playbooks`**: `name`, `category` ('rotation'|'objective'|'lategame'), `map_data` (jsonb com pinos/desenhos do planner), `description`, `linked_comp_id`.
**Nova tabela `tier_list`**: `pokemon`, `tier` ('S'|'A'|'B'|'C'|'D'), `lane`, `notes`, `patch`.

**Novas rotas:**
- `/builds` — grid de cards por Pokémon com itens, batidas, emblemas, moveset.
- `/jogadas` — biblioteca de planners salvos (estado do `/planner` serializado), botão "Carregar no Planner".
- `/tier-list` — tabela editável drag-to-tier estilo classic tier list.

**Melhorias em `/planner`:** botão "Salvar como jogada" persiste o estado atual em `playbooks`.
**Melhorias em `/composicoes`:** botão "Linkar a oponente" para sugerir comp contra time específico.

---

## Fase 5 — QoL: Export PDF + Modo Apresentação + Cronômetro

- **Modo apresentação** em `/draft`, `/planner`, `/composicoes`: botão fullscreen que esconde header/footer, fontes maiores, ideal para call/streaming.
- **Export PDF**: botão em comp/draft/planner usando `jspdf` + `html2canvas` (instalar). Gera 1 página com snapshot.
- **Timer de objetivos** flutuante em `/planner`: botões pré-configurados (Regis 7:00, Ray 2:00, Evolução 9:30) com countdown audível.
- Toggle de notificações no browser para lembretes de treinos próximos (1h antes), usando `Notification API` + intervalo no AppLayout.

---

## Detalhes Técnicos

### Migrações SQL (executadas em ordem por fase)

```text
Fase 2: ALTER TABLE scrims ADD opponent_id uuid, vod_url text, vod_notes text;
        CREATE TABLE opponents (id, name, tag, region, notes, recurring_picks, known_players, created_at);
Fase 3: CREATE TABLE attendance (id, event_id, event_type, member_id, status, note);
        CREATE TABLE announcements (id, title, body, pinned, author_member_id, created_at);
Fase 4: CREATE TABLE builds, playbooks, tier_list (...);
        ALTER TABLE compositions ADD linked_opponent_id uuid;
```

Todas as tabelas seguem o padrão atual: RLS habilitado com policies `public read` + `public write` (sem auth nesta etapa).

### Dependências novas

- `recharts` (já vem do shadcn/chart, confirmar)
- `jspdf` + `html2canvas` (Fase 5)

### Estrutura de arquivos novos

```text
src/routes/
  dashboard.tsx (substitui index visualmente)
  roster.tsx (move conteúdo de index.tsx)
  oponentes.tsx
  oponentes.$id.tsx
  mural.tsx
  builds.tsx
  jogadas.tsx
  tier-list.tsx
src/components/
  dashboard/KpiCard.tsx, WinrateChart.tsx, NextEvents.tsx
  scouting/OpponentForm.tsx, OpponentCombobox.tsx, VodEmbed.tsx
  agenda/RsvpControls.tsx
  builds/BuildCard.tsx, BuildForm.tsx
  shared/PresentationMode.tsx, ExportPdfButton.tsx, ObjectiveTimer.tsx
src/lib/
  stats.ts (cálculos de winrate, streak, agregados)
  pdf.ts (helpers de export)
```

### Atualizações no `AppLayout`

Nova ordem de navegação: Dashboard · Roster · Agenda · Treinos · Amistosos · Oponentes · Composições · Builds · Draft · Planner · Jogadas · Tier · Mural

Como ficarão muitos itens, transformo a nav em um menu compacto com agrupamento (dropdown "Estratégia" agrupa Comp/Draft/Planner/Jogadas/Tier; dropdown "Operação" agrupa Treinos/Amistosos/Oponentes/Mural).

### Importante

- **Auth/papéis** ficaram fora do escopo — adicionar autenticação muda fundamentalmente o modelo de dados (RLS por usuário, ownership) e merece um ciclo dedicado. Posso fazer isso depois como Fase 6.
- **Notificações push reais** exigem service worker + VAPID; nesta fase entrego apenas a `Notification API` do navegador (alerta enquanto a aba está aberta).

---

## Entregas confirmadas

✅ Dashboard com KPIs e gráficos · ✅ Estatísticas e histórico detalhado · ✅ Scouting de adversários · ✅ VOD Review · ✅ Tier list · ✅ RSVP/presença · ✅ Mural de avisos · ✅ Build guides · ✅ Biblioteca de jogadas · ✅ Comps por adversário · ✅ Cronômetro de objetivos · ✅ Export PDF · ✅ Modo apresentação · ✅ Notificações no navegador

❌ Não incluído nesta rodada: autenticação/papéis (escopo separado), substitutos com calendário de disponibilidade complexo (ofereço apenas RSVP), métricas individuais por jogador com KDA (depende de input manual extenso, ofereço somente agregados de scrims).

