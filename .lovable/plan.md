

# Plano: Suporte a Múltiplas Equipes (Multi-Team)

Transformar o app de "uma equipe única" para uma **Organização** que contém **várias Equipes (squads)**. Cada equipe terá seu próprio roster, scrims, treinos, avisos, builds, composições, oponentes, tier list, playbooks e identidade visual (nome, logo, cores).

## Fluxo do usuário

1. Login → cai em **`/equipes`** (lista das equipes às quais tem acesso).
2. Escolhe uma equipe → entra no painel daquela equipe (`/t/$teamSlug/...`).
3. Pode trocar de equipe pelo seletor no header a qualquer momento.
4. Super-admins veem botão "Criar nova equipe" e podem gerenciar todas.

## Modelo de permissões

- **Roles globais** (`user_roles`) ganham um novo nível: `super_admin` (gerencia organização inteira) + os existentes `coach` / `player` / `viewer` continuam como capacidade global.
- **Acesso por equipe** vira uma nova tabela `team_memberships(user_id, team_id, team_role)` onde `team_role` é `coach` | `player` | `viewer` **dentro daquela equipe**. Permite ser coach na Equipe A e player na Equipe B.

## Mudanças no banco

**Novas tabelas:**
- `teams` — id, slug (único), name, description, logo_url, primary_color, accent_color, archived, created_at
- `team_memberships` — id, user_id, team_id, team_role (enum), created_at, unique(user_id, team_id)

**Função SECURITY DEFINER** para evitar recursão em RLS:
- `is_team_member(_user_id, _team_id)` → boolean
- `team_role(_user_id, _team_id)` → enum
- `is_super_admin(_user_id)` → boolean

**Coluna `team_id` (uuid, NOT NULL após backfill) em:**
`members`, `announcements`, `scrims`, `trainings`, `builds`, `compositions`, `tier_list`, `opponents`, `playbooks`, `attendance`, `match_performances`, `opponent_performances`.

**Migração de dados:**
1. Criar uma equipe inicial "DragoUnite Y" com os valores atuais de `team_settings`.
2. Backfill de `team_id` em todas as tabelas com o id dessa equipe.
3. Inserir todos os usuários atuais como `team_memberships` dessa equipe (mantendo o role atual).
4. Tornar `team_id` NOT NULL.
5. Manter `team_settings` apenas para flags globais da organização (ou descontinuar — branding migra para `teams`).

**RLS atualizado em todas as tabelas escopadas:**
- SELECT: `is_team_member(auth.uid(), team_id)` OU `is_super_admin(auth.uid())`
- INSERT/UPDATE/DELETE: `team_role(auth.uid(), team_id) IN ('coach','player')` conforme regra atual de cada tabela, ou super_admin.

## Mudanças de rotas (TanStack Router)

```text
src/routes/
  index.tsx                  -> redireciona para /equipes
  equipes.tsx                -> NOVA: lista equipes do usuário + botão criar
  t.$teamSlug.tsx            -> NOVO layout (resolve teamId pelo slug, valida acesso, provê TeamContext)
  t.$teamSlug.index.tsx      -> dashboard daquela equipe (move conteúdo de index.tsx atual)
  t.$teamSlug.agenda.tsx     -> move agenda
  t.$teamSlug.amistosos.tsx
  t.$teamSlug.builds.tsx
  t.$teamSlug.composicoes.tsx
  t.$teamSlug.draft.tsx
  t.$teamSlug.jogadas.tsx
  t.$teamSlug.jogadores.$memberId.tsx
  t.$teamSlug.mural.tsx
  t.$teamSlug.oponentes.tsx
  t.$teamSlug.planner.tsx
  t.$teamSlug.roster.tsx
  t.$teamSlug.tier-list.tsx
  t.$teamSlug.treinos.tsx
  t.$teamSlug.admin.tsx      -> admin daquela equipe (roster, avisos, settings, membros)
  perfil.tsx                 -> permanece global (perfil do usuário)
  admin-org.tsx              -> NOVA: super-admin (criar equipes, gerenciar todas)
```

O layout `t.$teamSlug.tsx` faz `beforeLoad` validando se o usuário tem `team_membership` nessa equipe (senão `redirect /equipes`) e expõe `{ team, teamRole }` via `Route.useRouteContext()`.

## Mudanças no frontend

- **`useAuth`**: adiciona `isSuperAdmin`, mantém roles globais.
- **Novo hook `useCurrentTeam()`**: lê do contexto da rota `t.$teamSlug`. Substitui `useTeamSettings` em todas as páginas por este hook (que retorna `team` com nome/logo/cores).
- **`ThemeApplier`**: passa a ler do `useCurrentTeam` quando dentro de `/t/...`, e usa fallback neutro fora.
- **`AppLayout`**: header ganha um **TeamSwitcher** (dropdown com as equipes do usuário + "ver todas") visível apenas dentro de `/t/...`.
- **Todas as queries** (`useQuery` para members, scrims, builds, etc.): adicionar `.eq("team_id", teamId)` e incluir `teamId` na `queryKey`.
- **Todas as mutations** de criação: setar `team_id` no insert.
- **Server functions (`admin.functions.ts`)**: receber `team_id` no input, validar permissão por equipe (não mais role global), e ao criar membro/conta vincular ao `team_memberships` + setar `team_id` no `members`.
- **Página `/equipes`**: cards das equipes do usuário, com logo, nome e role; super-admin vê todas + botão "Nova equipe".
- **Página `/admin-org`**: criar/arquivar equipes, atribuir super-admins.

## Detalhes técnicos

- **Slug**: gerado a partir do nome (`slugify`), validado único, editável só por super-admin.
- **Branding por equipe**: `teams.primary_color`, `teams.accent_color`, `teams.logo_url` substituem `team_settings` no `ThemeApplier`. `team_settings` pode ser removida ou virar config global (timezone, flag de cadastro público).
- **Bucket `team-assets`**: adicionar pasta por equipe (`{team_id}/logo.png`) com policy de upload validando `is_team_member` + role coach.
- **Tipos**: Supabase regenera `types.ts` automaticamente após migração — todas as queries passam a ter `team_id` tipado.
- **Migração progressiva**: como há dados existentes, a migração inicial cria a equipe "default", popula `team_id` em tudo, e nenhum usuário perde acesso.

## Entregas em ordem

1. **Migração SQL**: criar `teams`, `team_memberships`, enum `team_role`, funções helpers, adicionar `team_id` em todas as tabelas, backfill, ativar NOT NULL, atualizar RLS.
2. **Hook `useCurrentTeam` + layout `t.$teamSlug.tsx`** com guard de acesso e contexto.
3. **Mover rotas existentes** para `t.$teamSlug.*` e adicionar `team_id` em todas as queries/mutations.
4. **Página `/equipes`** + redirect do `/` para `/equipes`.
5. **TeamSwitcher no header** + ThemeApplier lendo da equipe ativa.
6. **Refatorar `admin.functions.ts`** para escopar por equipe; admin da equipe gerencia memberships dela.
7. **Página `/admin-org`** para super-admins criarem equipes e promoverem outros super-admins.
8. **Migrar branding** de `team_settings` para `teams` e atualizar `TeamSettingsManager` para editar a equipe atual.

## Riscos e considerações

- É uma refatoração grande — toca quase todas as rotas e queries. Vai exigir testar cada página após a migração.
- Bookmarks antigos (ex.: `/agenda`) deixarão de funcionar — adicionar redirects de compatibilidade (`/agenda` → `/t/{default}/agenda`) durante a transição.
- O usuário atual (você) será automaticamente promovido a `super_admin` na migração inicial para garantir acesso ao painel global.

