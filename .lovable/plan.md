

# Funcionalidades para o painel `/admin`

A página atual já cobre **gestão de contas** (criar, permissão, vínculo com roster, reset de senha, remover) e **mural de avisos**. Abaixo estão funcionalidades de alto valor que faltam, agrupadas por prioridade. Você pode escolher quais quer que eu implemente.

---

## 🥇 Alto impacto (recomendadas primeiro)

### 1. Dashboard de visão geral (topo do admin)
KPIs rápidos para o coach:
- Total de contas / por permissão (coach / player / viewer)
- Membros do roster vs contas vinculadas (mostra "órfãos")
- Próximos eventos (treinos + scrims agendados nos próximos 7 dias)
- Últimos 5 logins
- Avisos fixados ativos

### 2. Log de auditoria
Histórico do que aconteceu no sistema:
- Quem criou/removeu conta, quem mudou permissão, quem publicou aviso, quem registrou scrim
- Nova tabela `audit_log` (actor_id, action, entity, entity_id, metadata, created_at)
- Triggers automáticos nas tabelas críticas (announcements, members, scrims, user_roles)
- Visualização paginada com filtros (por ator, por tipo de ação, por período)

### 3. Gestão completa do roster (não só via "Nova conta")
Hoje só dá pra criar membro junto com conta. Adicionar:
- Tabela editável com todos os membros (nome, IGN, lane, função, Pokémon main, Discord)
- Editar membros sem conta vinculada (ex.: substituto que ainda não tem login)
- Remover membros do roster sem deletar a conta
- Marcar membro como inativo (arquivar) sem perder histórico

### 4. Convites por e-mail (em vez de criar senha manual)
Hoje o coach digita a senha do jogador. Melhor:
- Botão "Enviar convite" → gera magic link via Supabase Admin API
- Jogador define a própria senha no primeiro acesso
- Lista de convites pendentes com opção de reenviar/cancelar

---

## 🥈 Médio impacto

### 5. Moderação do mural
- Ver curtidas e quem curtiu cada aviso (visão consolidada)
- Agendar publicação (campo `publish_at`)
- Expirar aviso automaticamente (campo `expires_at`)
- Categorias/tags (ex.: anúncio, treino, scrim, geral) com cores

### 6. Gerenciamento de scrims & treinos
Centralizar criação rápida sem precisar ir nas outras páginas:
- "Agendar treino" e "Agendar scrim" diretamente no admin
- Cancelar/reagendar em massa
- Ver estatísticas de presença por jogador (% de RSVP confirmado)

### 7. Relatórios & exportação
- Exportar lista de usuários (CSV)
- Exportar histórico de scrims com KDA por jogador (CSV / PDF)
- Relatório mensal de atividade do time

### 8. Configurações do time (nova tabela `team_settings`)
- Nome do time, logo, cores, descrição
- Fuso horário padrão
- Toggle "permitir cadastro público" (atualmente desabilitado por padrão)

---

## 🥉 Polimento

### 9. Busca e filtros na lista de usuários
- Campo de busca por email/nome
- Filtro por permissão e por status de vínculo (com/sem roster)
- Ordenação por último login

### 10. Notificações in-app
- Sino no header com contador
- Notificar jogadores quando: novo aviso, scrim agendada, treino confirmado
- Tabela `notifications` (user_id, type, payload, read_at)

### 11. Bulk actions
- Selecionar múltiplos usuários → mudar permissão em lote, enviar aviso direcionado, remover

---

## ❓ Pergunta

Quais dessas você quer que eu implemente agora? Recomendo começar com **1 (Dashboard) + 2 (Audit log) + 4 (Convites por e-mail)** — é o trio que mais profissionaliza o painel sem fragmentar muito a UI. Mas me diga sua preferência e eu monto o plano técnico detalhado da execução.

