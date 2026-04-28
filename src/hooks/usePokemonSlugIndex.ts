import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getUniteDbPokemon } from "@/server/unite-db.functions";
import type { UniteRole } from "@/lib/pokemon";

/** Mapeia o `tags.role` exato do unite-db para o tipo interno UniteRole. */
function normalizeRole(raw: string | undefined | null): UniteRole | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (s === "attacker") return "attacker";
  if (s === "speedster") return "speedster";
  if (s === "defender") return "defender";
  if (s === "supporter") return "supporter";
  if (s === "all-rounder" || s === "allrounder" || s === "all rounder")
    return "all-rounder";
  return null;
}

/**
 * Fetches the unite-db pokemon list (cached) and exposes a fast lookup
 * function that maps any pokemon name (display_name OR slug) to the
 * official unite-db slug used for CDN images.
 *
 * Reuses the same query key as /builds so it costs nothing extra after
 * the first load anywhere in the app.
 */
export function usePokemonSlugIndex() {
  const { data } = useQuery({
    queryKey: ["unite-db", "pokemon"],
    queryFn: () => getUniteDbPokemon(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { slugIndex, roleIndex } = useMemo(() => {
    const slug = new Map<string, string>();
    const role = new Map<string, UniteRole>();
    const addSlug = (key: string, value: string) => {
      const k = key.toLowerCase().trim();
      if (k && !slug.has(k)) slug.set(k, value);
    };
    const addRole = (key: string, value: UniteRole) => {
      const k = key.toLowerCase().trim();
      if (k && !role.has(k)) role.set(k, value);
    };
    const flat = (s: string) =>
      s.replace(/[-._']/g, " ").replace(/\s+/g, " ").trim();

    for (const p of data?.data ?? []) {
      const slugVal = p.name;
      const display = p.display_name;
      const r = normalizeRole(p.tags?.role);

      const keys = new Set<string>([
        display,
        slugVal,
        flat(display),
        flat(slugVal),
        flat(display).replace(/\s+/g, ""),
        flat(slugVal).replace(/\s+/g, ""),
      ]);
      // Aliases para variantes Mega
      if (/^mega\s+/i.test(display)) {
        const noMega = display.replace(/^mega\s+/i, "").trim();
        keys.add(noMega);
        keys.add(flat(noMega));
        keys.add(flat(noMega).replace(/\s+/g, ""));
      }
      const spaced = slugVal.replace(/([a-z])([A-Z])/g, "$1 $2");
      if (spaced !== slugVal) {
        keys.add(spaced);
        keys.add(`mega ${spaced}`);
      }

      for (const k of keys) {
        addSlug(k, slugVal);
        if (r) addRole(k, r);
      }
    }
    return { slugIndex: slug, roleIndex: role };
  }, [data]);

  function lookup<T>(map: Map<string, T>, name: string | null | undefined): T | null {
    if (!name) return null;
    const raw = name.toLowerCase().trim();
    if (map.has(raw)) return map.get(raw)!;
    const f = raw.replace(/[-._']/g, " ").replace(/\s+/g, " ").trim();
    if (map.has(f)) return map.get(f)!;
    const c = f.replace(/\s+/g, "");
    if (map.has(c)) return map.get(c)!;
    return null;
  }

  return {
    /** Resolve um nome qualquer para o slug oficial do unite-db. */
    resolve: (name: string | null | undefined) => lookup(slugIndex, name),
    /** Resolve a role oficial (unite-db) para qualquer nome conhecido. */
    resolveRole: (name: string | null | undefined) => lookup(roleIndex, name),
    ready: slugIndex.size > 0,
  };
}
