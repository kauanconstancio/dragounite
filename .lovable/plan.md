
# Plano: Central de Administração Interna do GymLy SaaS

Hoje você tem o `/dev` (Owner Console) restrito por email + `super_admin`. Isso funciona pra **você sozinho**, mas não escala pra um SaaS com **funcionários** (devs, financeiro, suporte, marketing). Vou propor uma estrutura profissional inspirada em painéis tipo Stripe/Linear/Vercel internos.

---

## 🎯 Conceito-chave: separar "staff" de "clientes"

Hoje as roles do app (`coach`, `player`, `viewer`, `super_admin`) são todas **roles de cliente** (de quem usa o produto). Funcionários da empresa **não são clientes** — eles são staff interno e precisam de roles próprias.

### Nova estrutura de staff (separada de `user_roles`)

Nova tabela `staff_members` + enum `staff_role`:
- **`owner`** — você (acesso total, gerencia outros staff)
- **`developer`** — devs (logs, edge functions, métricas técnicas, feature flags)
- **`finance`** — financeiro (MRR, churn, planos, faturas, waitlist como pipeline)
- **`support`** — suporte (feedbacks, contas de usuário, impersonate read-only)
- **`marketing`** — marketing (waitlist, analytics de conversão, campanhas)

Cada role vê **só as áreas relevantes**. Owner vê tudo.

```sql
CREATE TYPE public.staff_role AS ENUM ('owner','developer','finance','support','marketing');

CREATE TABLE public.staff_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role staff_role not null,
  full_name text,
  department text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

-- Função SECURITY DEFINER para checar staff (evita recursão de RLS)
CREATE FUNCTION public.is_staff(_user_id uuid, _role staff_role default null)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE user_id = _user_id AND active = true
      AND (_role IS NULL OR role = _role OR role = 'owner')
  )
$$;
```

RLS: só `owner` pode CRUD em `staff_members`. Todos staff podem ler.

---

## 🗂 Nova arquitetura de rotas

Renomear conceito de `/dev` → `/staff` (mais profissional, escala pra time). `/dev` continua redirecionando.

```
/staff                       → Visão geral (KPIs do SaaS) — todos staff
/staff/users                 → Gestão de usuários do produto — owner, support
/staff/teams                 → Gestão de organizações/times — owner, support
/staff/feedback              → Feedbacks (já existe) — todos staff
/staff/finance               → MRR, planos, receita, churn — owner, finance
/staff/finance/waitlist      → Pipeline de waitlist + conversão — owner, finance, marketing
/staff/marketing             → Funil de conversão, sources — owner, marketing
/staff/dev/logs              → Logs de auth/db/edge functions — owner, developer
/staff/dev/health            → Status do sistema, latências, erros — owner, developer
/staff/dev/feature-flags     → Toggles de features — owner, developer
/staff/staff                 → Gestão de funcionários (CRUD staff) — owner
/staff/audit                 → Audit log de ações de staff — owner
```

Cada rota faz `beforeLoad` checando `is_staff(user.id, 'role-necessária')`. Se não tem permissão, redireciona pra `/staff` (ou mostra "sem acesso").

---

## 📊 Conteúdo de cada área

### **1. Visão geral (`/staff`)**
KPIs unificados (a maioria você já tem):
- MRR / ARR (quando tiver billing)
- Usuários ativos (DAU/WAU/MAU)
- Times ativos vs arquivados
- Crescimento da waitlist (últimos 7/30 dias)
- Feedbacks abertos por prioridade
- Saúde do sistema (uptime, erros)

### **2. Financeiro (`/staff/finance`)**
- MRR por plano (placeholder até integrar Stripe)
- Receita mensal (gráfico de barras)
- Churn rate
- LTV médio
- Top 10 organizações por receita
- Lista de faturas pendentes/pagas
- **Sub-aba Waitlist como pipeline**: quantos por mês, taxa de conversão pra cliente pagante, exportar CSV

### **3. Marketing (`/staff/marketing`)**
- Funil: visitas landing → waitlist → ativação → cliente pago
- Sources de waitlist (`source` column)
- Conversão de waitlist → conta criada
- Campanhas (futuro)

### **4. Suporte (`/staff/users`, `/staff/teams`, `/staff/feedback`)**
- Lista de todos usuários com busca/filtro (já existe parcialmente em `/admin-org`)
- Ver detalhe de um usuário: times, atividade, último login, feedbacks enviados
- Resetar senha, desativar conta, reenviar email de confirmação
- Lista de organizações: quantos membros, último treino, plano
- **Impersonate read-only** (logar como se fosse o usuário, só pra debugar — registrado no audit log)
- Feedbacks (já existe), agora com atribuição a staff member

### **5. Dev (`/staff/dev/*`)**
- **Logs**: stream de auth/db/edge logs (Supabase analytics_query)
- **Health**: latência média, taxa de erro, edge functions status
- **Feature flags**: tabela `feature_flags` (key, enabled, rollout_pct, target_team_ids), toggles ao vivo

### **6. Staff (`/staff/staff`) — só owner**
- Lista de funcionários: nome, email, role, departamento, ativo
- Adicionar staff: convida por email, atribui role (owner pode ver/editar tudo)
- Desativar staff sem deletar conta (soft delete)
- Mudar role

### **7. Audit (`/staff/audit`) — só owner**
Tabela `staff_audit_log` registrando toda ação destrutiva ou sensível:
- Quem (staff_id), quando, o quê (`action`), em quem (`target_user_id`/`target_team_id`), payload JSON
- Ações: `impersonate`, `reset_password`, `change_role`, `delete_team`, `feature_flag_toggle`, etc.
- Filtros por staff/ação/data

---

## 🔐 Modelo de segurança

1. **`staff_members` separada de `user_roles`** — funcionário é staff, não cliente. Pode ser staff E ter conta de cliente, mas as permissões são independentes.
2. **Função `is_staff(user_id, role)`** SECURITY DEFINER pra usar em RLS sem recursão.
3. **Email allowlist removido** — `DEV_OWNER_EMAILS` deixa de fazer sentido quando você tem time. Acesso passa a ser 100% via `staff_members`. Você (kauanconstancio13@gmail.com) é seedado como `owner` na migration.
4. **Server functions** (`src/server/staff.functions.ts`) com middleware `requireStaff(role?)` validando antes de cada ação.
5. **Audit log automático** via wrapper nas server functions sensíveis.
6. **Rate limit** em ações destrutivas (deletar usuário, mudar role).

---

## 🎨 UX

- **Sidebar interna do `/staff`** (separada da sidebar do app cliente) com seções colapsáveis por área (Geral, Suporte, Financeiro, Marketing, Dev, Sistema).
- Visual mantém a estética "Owner Console" atual (gold accents, dark) pra deixar claro que é zona interna.
- Badge no canto: "STAFF MODE — {role}" sempre visível pra evitar confusão.
- Cada item da sidebar só aparece se o staff tem permissão.

---

## 📦 Implementação faseada

### **Fase 1 — Fundação (essencial)**
1. Migration: `staff_role` enum + `staff_members` + `is_staff()` + RLS + seed do owner
2. Migration: `staff_audit_log` + RLS
3. Hook `useStaff()` (substitui parcialmente `isDevOwner`)
4. Renomear `/dev` → `/staff` com layout próprio (sidebar interna, badge de role)
5. Página `/staff/staff` (gestão de funcionários) — só owner
6. Migrar páginas existentes (`/dev/feedback`, `/dev/index`) pra `/staff/feedback`, `/staff/`

### **Fase 2 — Áreas departamentais**
7. `/staff/users` e `/staff/teams` (consolidar do que já existe em `/admin-org`)
8. `/staff/finance` com KPIs placeholder + waitlist pipeline
9. `/staff/marketing` com funil de waitlist
10. Audit log automático nas ações sensíveis

### **Fase 3 — Avançado (depois)**
11. `/staff/dev/logs` (consumir Supabase analytics)
12. `/staff/dev/feature-flags` (tabela + toggles)
13. Impersonate read-only com audit
14. Integração Stripe pra MRR real

---

## ❓ Antes de começar, preciso decidir 4 coisas

1. **Escopo da Fase 1**: implemento só a fundação (staff_members + gestão de staff + migração das páginas atuais), ou já incluo Finance/Marketing com dados placeholder?
2. **`/dev` antigo**: mantenho redirecionando pra `/staff` ou removo de vez?
3. **Allowlist de email (`DEV_OWNER_EMAILS`)**: removo agora (acesso 100% via tabela `staff_members`) ou mantenho como fallback de segurança?
4. **Billing/Stripe**: já quer integrar real (precisa enable Stripe no Cloud) ou só estrutura visual com mock data por enquanto?

Me responde essas 4 e parto pra implementação. Recomendo: **Fase 1 completa + placeholders nas outras áreas + remover allowlist + Stripe depois**.
