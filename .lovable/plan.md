## Objetivo

Integrar dados públicos do **unite-db.com** ao Dragounite para:
1. Enriquecer a página `/builds` com dados reais (held items, battle items, movesets, builds sugeridas, emblemas) puxados da API
2. Criar uma nova página `/patches` exibindo os últimos patch notes oficiais do Pokémon Unite

Tudo com cache server-side para reduzir requisições e manter velocidade.

---

## Endpoints descobertos no unite-db.com

Todos retornam JSON estático (sem chave, gratuito):

| URL | Conteúdo | Tamanho |
|---|---|---|
| `https://unite-db.com/pokemon.json` | 91 Pokémons com `builds[]`, `skills[]`, `tier`, `damage_type`, `tags` | ~2.9 MB |
| `https://unite-db.com/held_items.json` | 41 hold items com bônus, descrição e stats | ~80 KB |
| `https://unite-db.com/battle_items.json` | 10 battle items com cooldown, tier, level | ~2 KB |
| `https://unite-db.com/emblems.json` | Sistema completo de emblemas | ~95 KB |
| `https://unite-db.com/stats.json` | Tabelas de stats por nível | ~230 KB |
| `https://unite-db.com/_nuxt/static/{hash}/patch-notes/payload.js` | Patch notes (Nuxt JSONP do CMS Contentful) | ~varia |

**Nota sobre patches**: o path tem um hash de versão que muda quando o site faz deploy. Vou implementar uma rotina que primeiro busca a homepage para descobrir o hash atual, depois baixa o payload.

---

## Arquitetura

### 1. Server functions com cache em memória (Worker)
Arquivo `src/server/unite-db.functions.ts` com `createServerFn` para cada recurso. Cache TTL:
- Pokémons / items / emblems: **6 horas** (mudam só em patch)
- Patch notes: **1 hora**

Cache em `Map` no escopo do módulo do Worker (suficiente; rehidrata ao expirar). Cada server function retorna dado normalizado e tipado.

### 2. Tipos compartilhados
`src/lib/unite-db-types.ts` — interfaces `UniteDbPokemon`, `UniteDbBuild`, `UniteDbHeldItem`, `UniteDbBattleItem`, `UniteDbPatchNote`.

### 3. Página `/builds` reformulada
Layout em duas colunas:
- **Esquerda (sidebar sticky)**: lista de Pokémons (filtro por papel + busca) — clica e carrega builds oficiais
- **Direita (conteúdo)**: 
  - Header do Pokémon (sprite, tier, damage type, tags)
  - Skills (early learn + standard moves) com tooltips
  - **Builds sugeridas** (cards) vindas da API: nome da build, lane, held items (com ícones), battle item, moveset escolhido (basic/upgrade), links para emblemas
  - Seção "Suas builds salvas" (mantém o CRUD atual em Supabase, mas com botão "Importar build da API" pré-preenchendo o dialog)

### 4. Nova página `/patches`
Rota `src/routes/patches.tsx`:
- Lista cronológica dos últimos ~15 patches
- Cada item: título, data, badge ("Bugfix" / "Balance" / etc. inferido do título)
- Conteúdo formatado com `react-markdown` + `remark-gfm` (já compatível, instala dois pacotes leves)
- Filtro por busca de texto (Pokémon mencionado, ex: "Pikachu")
- Card destaque para o patch mais recente
- Link sutil "Fonte: unite-db.com" no rodapé (boas práticas de atribuição)

### 5. Item de menu
Adicionar "Patches" ao `AppLayout.tsx` próximo de Builds e Tier List.

---

## Detalhes técnicos

**Server functions** (resumo):
```ts
// src/server/unite-db.functions.ts
const cache = new Map<string, { data: unknown; expiresAt: number }>();

async function fetchCached<T>(key: string, url: string, ttlMs: number): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data as T;
  const res = await fetch(url, { headers: { "User-Agent": "Dragounite/1.0" } });
  if (!res.ok) throw new Error(`unite-db ${key} ${res.status}`);
  const data = await res.json();
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data as T;
}

export const getUnitePokemon = createServerFn({ method: "GET" })
  .handler(() => fetchCached("pokemon", "https://unite-db.com/pokemon.json", 6*3600_000));
// idem para held_items, battle_items, emblems
```

**Patches** (lida com hash dinâmico):
```ts
export const getUnitePatches = createServerFn({ method: "GET" }).handler(async () => {
  // 1) baixa a página /patch-notes para extrair o hash atual
  const html = await fetch("https://unite-db.com/patch-notes").then(r=>r.text());
  const m = html.match(/_nuxt\/static\/(\d+)\/patch-notes\/payload\.js/);
  if (!m) throw new Error("unite-db: hash não encontrado");
  const payloadUrl = `https://unite-db.com/_nuxt/static/${m[1]}/patch-notes/payload.js`;
  const jsonp = await fetch(payloadUrl).then(r=>r.text());
  // 2) parseia JSONP: __NUXT_JSONP__("/patch-notes", (function(...){return {data:[...]}})(...))
  // — extrai o objeto invocando new Function() em sandbox simples
  const fn = new Function(`return ${jsonp.replace(/^__NUXT_JSONP__\([^,]+,\s*/, "").replace(/\);?\s*$/, "")}`);
  const result = fn()();
  return normalizePatches(result.data[0].posts);
});
```

**TanStack Query no client**: `useQuery` com `staleTime: 30 min` para os dados pesados (Pokémons), evitando refetch ao trocar de aba.

**Imagens dos itens**: `unite-db.com` serve em `https://d275t8dp8rxb42.cloudfront.net/items/{slug}.png` (CloudFront público, descobre-se pelo HTML — uso de imagens externas com atribuição é ok para fan tools).

---

## Arquivos criados/editados

- **Novo** `src/lib/unite-db-types.ts` — tipos
- **Novo** `src/server/unite-db.functions.ts` — server fns + cache
- **Novo** `src/routes/patches.tsx` — página de patch notes
- **Novo** `src/components/builds/UniteBuildCard.tsx` — card de build vinda da API
- **Novo** `src/components/builds/PokemonDetailPanel.tsx` — painel direito da nova /builds
- **Editado** `src/routes/builds.tsx` — novo layout 2 colunas, mantendo CRUD atual
- **Editado** `src/components/AppLayout.tsx` — link para "Patches"
- **Dependências**: `bun add react-markdown remark-gfm`

---

## Considerações

- **Atribuição**: adiciono "Dados de unite-db.com" no rodapé das duas páginas (boa prática + transparente)
- **Resiliência**: se a API falhar (ex: hash de patches mudou e regex falhou), exibo mensagem amigável + fallback para builds salvas no Supabase
- **Sem chave / sem custos**: tudo público, sem secrets adicionais
- **Sem mudanças no banco**: builds customizadas continuam no Supabase como hoje

Quer que eu prossiga com a implementação?
