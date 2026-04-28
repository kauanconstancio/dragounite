import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getUniteDbPokemon } from "@/server/unite-db.functions";

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

  const index = useMemo(() => {
    const map = new Map<string, string>();
    const add = (key: string, slug: string) => {
      const k = key.toLowerCase().trim();
      if (k && !map.has(k)) map.set(k, slug);
    };
    const flat = (s: string) =>
      s.replace(/[-._']/g, " ").replace(/\s+/g, " ").trim();

    for (const p of data?.data ?? []) {
      const slug = p.name;
      const display = p.display_name;

      // 1) chaves diretas
      add(display, slug);
      add(slug, slug);

      // 2) variantes normalizadas (sem hífens / pontos / apóstrofos)
      add(flat(display), slug);
      add(flat(slug), slug);
      add(flat(display).replace(/\s+/g, ""), slug);
      add(flat(slug).replace(/\s+/g, ""), slug);

      // 3) aliases para variantes Mega — roster interno usa "Charizard X",
      //    "Mewtwo Y", "Mega Lucario" etc., enquanto a API expõe
      //    "Mega Charizard X" / "Mega Mewtwo X". Indexa ambos os formatos.
      if (/^mega\s+/i.test(display)) {
        const noMega = display.replace(/^mega\s+/i, "").trim();
        add(noMega, slug);
        add(flat(noMega), slug);
        add(flat(noMega).replace(/\s+/g, ""), slug);
      }
      // slug "MewtwoX" → "Mewtwo X" / "Mega Mewtwo X"
      const spaced = slug.replace(/([a-z])([A-Z])/g, "$1 $2");
      if (spaced !== slug) {
        add(spaced, slug);
        add(`mega ${spaced}`, slug);
      }
    }
    return map;
  }, [data]);

  function resolve(name: string | null | undefined): string | null {
    if (!name) return null;
    const raw = name.toLowerCase().trim();
    if (index.has(raw)) return index.get(raw)!;
    const flat = raw.replace(/[-._']/g, " ").replace(/\s+/g, " ").trim();
    if (index.has(flat)) return index.get(flat)!;
    const compact = flat.replace(/\s+/g, "");
    if (index.has(compact)) return index.get(compact)!;
    return null;
  }

  return { resolve, ready: index.size > 0 };
}
