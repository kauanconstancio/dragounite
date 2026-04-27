
# 🚀 Landing Page GymLy — SaaS para times de Pokémon Unite

## 🎨 Identidade visual

- **Paleta Midnight Indigo**: `#0a0a1a` (bg), `#141432` (surface), `#1e1e5a` (accent), `#4f46e5` (primary/CTA)
- **Tipografia**: Sora (headings, peso bold/extrabold) + Manrope (body)
- **Vibe**: SaaS tech sofisticado, dark mode, com glow/gradient sutis em indigo
- **Posicionamento**: "GymLy — A central de operações para times de Pokémon Unite" (com hint de expansão multi-esports)

## 📁 Arquitetura de rotas

Vou criar uma rota dedicada `/landing` (separada do app principal em `/`) para não quebrar o sistema atual. A landing terá seu próprio layout independente do `AppLayout` (sem sidebar de operações).

**Novos arquivos:**
- `src/routes/landing.tsx` — rota da landing page com `head()` próprio para SEO
- `src/components/landing/LandingNav.tsx` — nav superior (logo + CTA waitlist + login)
- `src/components/landing/HeroSection.tsx` — hero com headline, subheadline, CTA waitlist e mockup visual
- `src/components/landing/FeaturesSection.tsx` — grid de features (Roster, Scrims, Draft, Scouting, Dashboard, Tier List)
- `src/components/landing/HowItWorksSection.tsx` — 3 passos: Cadastre seu time → Registre scrims → Evolua com dados
- `src/components/landing/SocialProofSection.tsx` — stats (times usando, scrims registradas, etc.) + depoimentos placeholder
- `src/components/landing/RoadmapSection.tsx` — "Em breve: League of Legends, Valorant, Rainbow Six"
- `src/components/landing/WaitlistForm.tsx` — formulário de captura (email + nome do time)
- `src/components/landing/FaqSection.tsx` — FAQ accordion (4-6 perguntas)
- `src/components/landing/LandingFooter.tsx` — footer com links sociais

**AppLayout**: ajustar para detectar a rota `/landing` e não renderizar a estrutura de app (sidebar/header de operações) — a landing roda standalone.

## 🗄️ Backend (Lovable Cloud)

**Tabela nova `waitlist`** via migration:
```sql
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  team_name TEXT,
  source TEXT DEFAULT 'landing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```
- RLS habilitado
- Policy: qualquer um pode `INSERT` (público, sem auth)
- Policy: somente super_admin pode `SELECT/DELETE` (gestão via /dev)

## 🧩 Conteúdo das seções

### 1. Hero
- **Headline**: "Eleve seu time de Pokémon Unite ao próximo nível"
- **Subheadline**: "GymLy é a plataforma all-in-one para gerenciar roster, scrims, drafts e evolução de jogadores. Decisões guiadas por dados, não por achismo."
- **CTAs**: "Entrar na waitlist" (primário) + "Ver demo" (secundário, scroll para features)
- **Visual**: mockup do dashboard atual com glow indigo

### 2. Features (6 cards)
- 🎯 **Roster & Jogadores** — perfis individuais com KDA, win rate por lane, top pokémons
- ⚔️ **Scrims & Amistosos** — registre partidas, performance individual, evolução temporal
- 🧠 **Draft Tool** — simule picks/bans, planeje composições antes de cada partida
- 🔍 **Scouting** — analise oponentes, VODs, padrões de jogo
- 📊 **Dashboard de Performance** — gráficos de KDA, win rate, radar de time
- 🏆 **Tier List & Composições** — meta atualizado, builds, estratégias

### 3. Como funciona (3 passos)
1. Crie sua organização e roster
2. Registre treinos, scrims e performance
3. Acompanhe a evolução com dashboards e tome decisões baseadas em dados

### 4. Social proof (placeholders honestos)
- Stats animadas: "X times ativos", "Y scrims registradas", "Z partidas analisadas"
- Frase: "Em fase de early access — junte-se aos times pioneiros"

### 5. Roadmap multi-esports
- Cards com: ✅ Pokémon Unite (disponível) · 🔜 League of Legends · 🔜 Valorant · 🔜 Rainbow Six

### 6. Waitlist Form
- Campos: email* + nome do time (opcional)
- Validação Zod, mutation salvando em `waitlist`
- Toast de sucesso + estado pós-submit ("Você está na lista!")

### 7. FAQ
- "O que é GymLy?"
- "Preciso pagar para usar?"
- "Como meu time se cadastra?"
- "Vocês vão suportar outros jogos?"
- "Meus dados estão seguros?"

### 8. Footer
- Logo + tagline
- Links: Sobre, Contato, Login, Privacidade
- Social (Discord/Twitter placeholders)

## 🔗 Integração com app existente

- Link "Login" no nav da landing → `/auth`
- Link "Já uso o GymLy" → `/`
- Em `/dev/index`, adicionar **KPI de waitlist** (total de inscritos) e link para uma futura `/dev/waitlist` (não nesta etapa)
- Manter `<title>` e branding atual do app (Dragounite) intacto — landing usa **GymLy** apenas para teste de novo nome

## 🎯 SEO/Meta

`head()` da rota `/landing`:
- title: "GymLy — Gestão competitiva para times de Pokémon Unite"
- description: "Plataforma all-in-one para roster, scrims, draft e scouting. Eleve seu time com decisões guiadas por dados."
- og:title, og:description, twitter:card

## ✅ Resultado esperado

Acessando `/landing`, você verá uma landing page profissional, dark/indigo, com hero impactante, features bem apresentadas, formulário de waitlist funcional gravando no banco, e CTA claro para login no app existente. Pronta para validar o nome **GymLy** e começar a captar interessados antes de lançar como SaaS pago.
