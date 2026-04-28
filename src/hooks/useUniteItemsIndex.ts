import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  getUniteDbBattleItems,
  getUniteDbHeldItems,
} from "@/server/unite-db.functions";
import type { UniteDbBattleItem, UniteDbHeldItem } from "@/lib/unite-db-types";

/**
 * Indexa held items e battle items do unite-db por nome (case/punct insensitive)
 * para permitir tooltips ricas em qualquer parte do app sem refetch.
 */
export function useUniteItemsIndex() {
  const held = useQuery({
    queryKey: ["unite-db", "held_items"],
    queryFn: () => getUniteDbHeldItems(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  const battle = useQuery({
    queryKey: ["unite-db", "battle_items"],
    queryFn: () => getUniteDbBattleItems(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const norm = (s: string) =>
    s.toLowerCase().replace(/[-._'+]/g, " ").replace(/\s+/g, " ").trim();

  const heldIndex = useMemo(() => {
    const map = new Map<string, UniteDbHeldItem>();
    for (const it of held.data?.data ?? []) {
      map.set(norm(it.name), it);
      map.set(norm(it.display_name), it);
    }
    return map;
  }, [held.data]);

  const battleIndex = useMemo(() => {
    const map = new Map<string, UniteDbBattleItem>();
    for (const it of battle.data?.data ?? []) {
      map.set(norm(it.name), it);
      map.set(norm(it.display_name), it);
    }
    return map;
  }, [battle.data]);

  return {
    findHeld: (name: string): UniteDbHeldItem | null =>
      heldIndex.get(norm(name)) ?? null,
    findBattle: (name: string): UniteDbBattleItem | null =>
      battleIndex.get(norm(name)) ?? null,
  };
}
