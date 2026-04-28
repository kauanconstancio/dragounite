import { createServerFn } from "@tanstack/react-start";
import type {
  UniteDbBattleItem,
  UniteDbHeldItem,
  UniteDbPatchNote,
  UniteDbPokemon,
} from "@/lib/unite-db-types";

// Cache em memória do Worker. Chave -> { data, expiresAt }.
// Persiste enquanto a instância do Worker estiver viva (best-effort).
const cache = new Map<string, { data: unknown; expiresAt: number }>();

const HOUR = 60 * 60 * 1000;

async function fetchCached<T>(key: string, url: string, ttlMs: number): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.data as T;
  }
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Dragounite/1.0 (+https://dragounite.lovable.app)",
      Accept: "application/json,text/plain,*/*",
    },
  });
  if (!res.ok) {
    throw new Error(`unite-db ${key} HTTP ${res.status}`);
  }
  const data = (await res.json()) as T;
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
}

export const getUniteDbPokemon = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const data = await fetchCached<UniteDbPokemon[]>(
      "pokemon",
      "https://unite-db.com/pokemon.json",
      6 * HOUR,
    );
    return { data, error: null as string | null };
  } catch (err) {
    console.error("[unite-db] pokemon fetch failed:", err);
    return { data: [] as UniteDbPokemon[], error: "Falha ao carregar Pokémons" };
  }
});

export const getUniteDbHeldItems = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const data = await fetchCached<UniteDbHeldItem[]>(
      "held_items",
      "https://unite-db.com/held_items.json",
      6 * HOUR,
    );
    return { data, error: null as string | null };
  } catch (err) {
    console.error("[unite-db] held items fetch failed:", err);
    return { data: [] as UniteDbHeldItem[], error: "Falha ao carregar held items" };
  }
});

export const getUniteDbBattleItems = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const data = await fetchCached<UniteDbBattleItem[]>(
      "battle_items",
      "https://unite-db.com/battle_items.json",
      6 * HOUR,
    );
    return { data, error: null as string | null };
  } catch (err) {
    console.error("[unite-db] battle items fetch failed:", err);
    return { data: [] as UniteDbBattleItem[], error: "Falha ao carregar battle items" };
  }
});

/**
 * Patches são servidos pelo Nuxt em /_nuxt/static/{hash}/patch-notes/payload.js
 * O hash muda a cada deploy do unite-db. Estratégia:
 * 1) baixa /patch-notes (HTML)
 * 2) extrai o hash via regex
 * 3) baixa o payload JSONP
 * 4) avalia o JSONP em sandbox restrito (sem acesso a globals)
 */
export const getUniteDbPatches = createServerFn({ method: "GET" }).handler(async () => {
  const cacheKey = "patches";
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) {
    return { data: hit.data as UniteDbPatchNote[], error: null as string | null };
  }

  try {
    const html = await fetch("https://unite-db.com/patch-notes", {
      headers: { "User-Agent": "Dragounite/1.0" },
    }).then((r) => r.text());

    const hashMatch = html.match(/_nuxt\/static\/(\d+)\/patch-notes\/payload\.js/);
    if (!hashMatch) throw new Error("hash do payload não encontrado");

    const payloadUrl = `https://unite-db.com/_nuxt/static/${hashMatch[1]}/patch-notes/payload.js`;
    const jsonp = await fetch(payloadUrl, {
      headers: { "User-Agent": "Dragounite/1.0" },
    }).then((r) => r.text());

    // Formato: __NUXT_JSONP__("/patch-notes", (function(a,b,...){return {...}})(...));
    // Extrai a expressão entre o primeiro ", " e o ");" final.
    const inner = jsonp.replace(/^[^,]*,\s*/, "").replace(/\)\s*;?\s*$/, "");
    // Avalia em sandbox: a expressão é "(function(...){...})(...)" — sem acesso a fetch/process.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const evaluator = new Function(`"use strict"; return (${inner});`);
    const result = evaluator() as { data?: Array<{ posts?: Array<{ sys?: { id?: string }; fields?: Partial<UniteDbPatchNote> }> }> };

    const posts = result?.data?.[0]?.posts ?? [];
    const normalized: UniteDbPatchNote[] = posts
      .map((p) => ({
        id: p.sys?.id ?? p.fields?.slug ?? "",
        title: p.fields?.title ?? "",
        slug: p.fields?.slug ?? "",
        patchDate: p.fields?.patchDate ?? "",
        patchNoteDetails: p.fields?.patchNoteDetails ?? "",
      }))
      .filter((p) => p.title && p.patchDate)
      .sort((a, b) => (a.patchDate < b.patchDate ? 1 : -1));

    cache.set(cacheKey, { data: normalized, expiresAt: Date.now() + 1 * HOUR });
    return { data: normalized, error: null as string | null };
  } catch (err) {
    console.error("[unite-db] patches fetch failed:", err);
    return { data: [] as UniteDbPatchNote[], error: "Falha ao carregar patch notes" };
  }
});
