// Tipagens para os dados expostos por https://unite-db.com (JSON estático).
// Mantemos apenas os campos que efetivamente consumimos na UI.

export type UniteDbBuild = {
  name: string;
  lane?: string;
  held_items: string[];
  held_items_optional?: string;
  battle_item?: string;
  battle_item_optional?: string;
  basic?: string[];
  upgrade?: string[];
  emblem_name?: string[];
  emblem_link?: string[];
};

export type UniteDbSkill = {
  name: string;
  ability?: string;
  description?: string;
};

export type UniteDbPokemon = {
  name: string;
  display_name: string;
  tier?: string;
  soloQtier?: string;
  damage_type?: string;
  tags?: { range?: string; difficulty?: string; role?: string };
  notes?: string;
  // API retorna estes como flags string ("True"/"False"), não listas.
  early_learn?: string;
  standard_moves?: string;
  builds: UniteDbBuild[];
  skills?: UniteDbSkill[];
  last_updated?: string;
};

export type UniteDbHeldItem = {
  name: string;
  display_name: string;
  bonus1?: string;
  bonus2?: string;
  bonus3?: string;
  description1?: string;
  description2?: string;
  tier?: string;
};

export type UniteDbBattleItem = {
  name: string;
  display_name: string;
  description?: string;
  tier?: string;
  cooldown?: number;
  level?: number;
};

export type UniteDbPatchNote = {
  id: string;
  title: string;
  slug: string;
  patchDate: string; // ISO YYYY-MM-DD
  patchNoteDetails: string; // markdown
};

// CDN público de imagens do unite-db (descoberto via bundle público do site).
export const UNITE_DB_CDN = "https://d275t8dp8rxb42.cloudfront.net";

/** Espaços viram "+" — convenção interna do unite-db para os filenames. */
function uniteFile(name: string): string {
  return name.replace(/ /g, "+");
}

export function heldItemImage(name: string): string {
  return `${UNITE_DB_CDN}/items/held/${uniteFile(name)}.png`;
}

export function battleItemImage(name: string): string {
  return `${UNITE_DB_CDN}/items/battle/${uniteFile(name)}.png`;
}

/**
 * Retorna a URL do retrato oficial de um Pokémon no CDN do unite-db.
 * O `slug` deve ser o campo `name` retornado por /pokemon.json
 * (ex.: "Aegislash", "MewtwoX", "Mr.Mime", "Mega-Charizard-X").
 */
export function pokemonImage(slug: string): string {
  return `${UNITE_DB_CDN}/pokemon/portrait/${encodeURIComponent(slug)}.png`;
}

/**
 * Retorna a URL do ícone de uma skill (move, passiva ou unite move).
 * `pokemonSlug` é o campo `name` da API; `skillName` é o `name` da skill.
 */
export function skillImage(pokemonSlug: string, skillName: string): string {
  return `${UNITE_DB_CDN}/skills/${pokemonSlug}/${uniteFile(skillName)}.png`;
}
