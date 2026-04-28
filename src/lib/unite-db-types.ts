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
  tags?: string[];
  notes?: string;
  early_learn?: string[];
  standard_moves?: string[];
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

// CDN público de imagens do unite-db (descoberto via HTML público do site).
export const UNITE_DB_CDN = "https://d275t8dp8rxb42.cloudfront.net";

export function heldItemImage(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${UNITE_DB_CDN}/items/${slug}.png`;
}

export function battleItemImage(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${UNITE_DB_CDN}/battle_items/${slug}.png`;
}
