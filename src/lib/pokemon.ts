export const ROLE_LABEL: Record<string, string> = {
  player: "Jogador Titular",
  substitute: "Reserva",
  coach: "Coach",
  manager: "Gerente",
};

export const ROLE_COLORS: Record<string, string> = {
  player: "bg-primary/20 text-primary border-primary/40",
  substitute: "bg-muted text-muted-foreground border-border",
  coach: "bg-gold/20 text-gold border-gold/40",
  manager: "bg-accent text-foreground border-border",
};

export const LANE_LABEL: Record<string, string> = {
  top: "Top Lane",
  jungle: "Jungle",
  mid: "Mid",
  bot: "Bot Lane",
  support: "Support",
  flex: "Flex",
};

// Pokémon Unite battle roles (papéis no jogo)
export type UniteRole = "attacker" | "speedster" | "all-rounder" | "defender" | "supporter";

export const UNITE_ROLE_LABEL: Record<UniteRole, string> = {
  attacker: "Atacante",
  speedster: "Veloz",
  "all-rounder": "Versátil",
  defender: "Defensor",
  supporter: "Suporte",
};

// Descrição detalhada e dica de gameplay para cada papel
export const UNITE_ROLE_INFO: Record<UniteRole, { description: string; tip: string }> = {
  attacker: {
    description: "Atacantes têm baixa resistência mas causam dano massivo a longa distância. Vidro canhão da equipe.",
    tip: "Fique atrás dos aliados, foque no carry inimigo e nunca entre primeiro nas trocas.",
  },
  speedster: {
    description: "Velozes têm alta mobilidade e ofensiva. Especialistas em pontuar rápido e flanquear inimigos.",
    tip: "Pressione a jungle, roube objetivos e isole alvos isolados — entre, abata e fuja.",
  },
  "all-rounder": {
    description: "Versáteis equilibram ataque e defesa. Bons iniciadores de team fight e duelistas resilientes.",
    tip: "Inicie as lutas, divida atenção do time inimigo e foque os squishies depois do CC.",
  },
  defender: {
    description: "Defensores têm alta resistência. Protegem aliados, controlam zonas e absorvem dano.",
    tip: "Tanque objetivos, segure o frontline e use CC para criar espaço para o seu carry.",
  },
  supporter: {
    description: "Suportes curam aliados, aplicam status e controlam o ritmo das lutas.",
    tip: "Fique na bot lane com o atacante, proteja o carry e priorize visão e objetivos.",
  },
};

// Tailwind classes para fundo + borda + sombra colorida por papel
export const UNITE_ROLE_STYLES: Record<UniteRole, { bg: string; ring: string; glow: string; text: string }> = {
  attacker: {
    bg: "bg-gradient-to-br from-orange-500/40 to-orange-700/20",
    ring: "border-orange-500/60",
    glow: "shadow-[0_0_18px_-2px_rgba(249,115,22,0.55)]",
    text: "text-orange-300",
  },
  speedster: {
    bg: "bg-gradient-to-br from-sky-500/40 to-sky-700/20",
    ring: "border-sky-500/60",
    glow: "shadow-[0_0_18px_-2px_rgba(14,165,233,0.55)]",
    text: "text-sky-300",
  },
  "all-rounder": {
    bg: "bg-gradient-to-br from-purple-500/40 to-purple-800/20",
    ring: "border-purple-500/60",
    glow: "shadow-[0_0_18px_-2px_rgba(168,85,247,0.55)]",
    text: "text-purple-300",
  },
  defender: {
    bg: "bg-gradient-to-br from-emerald-500/40 to-emerald-800/20",
    ring: "border-emerald-500/60",
    glow: "shadow-[0_0_18px_-2px_rgba(16,185,129,0.55)]",
    text: "text-emerald-300",
  },
  supporter: {
    bg: "bg-gradient-to-br from-yellow-400/40 to-amber-700/20",
    ring: "border-yellow-400/60",
    glow: "shadow-[0_0_18px_-2px_rgba(250,204,21,0.55)]",
    text: "text-yellow-300",
  },
};

// Lista completa do roster do Pokémon Unite
// { name, slug (para URL da imagem oficial), role }
export type UnitePokemon = { name: string; slug: string; role: UniteRole };

export const POKEMON_DATA: UnitePokemon[] = [
  // Attackers
  { name: "Alolan Ninetales", slug: "alolan-ninetales", role: "attacker" },
  { name: "Articuno", slug: "articuno", role: "attacker" },
  { name: "Moltres", slug: "moltres", role: "attacker" },
  { name: "Zapdos", slug: "zapdos", role: "attacker" },
  { name: "Charizard Y", slug: "charizard", role: "attacker" },
  { name: "Alolan Raichu", slug: "alolan-raichu", role: "attacker" },
  { name: "Armarouge", slug: "armarouge", role: "attacker" },
  { name: "Chandelure", slug: "chandelure", role: "attacker" },
  { name: "Cinderace", slug: "cinderace", role: "attacker" },
  { name: "Cramorant", slug: "cramorant", role: "attacker" },
  { name: "Decidueye", slug: "decidueye", role: "attacker" },
  { name: "Delphox", slug: "delphox", role: "attacker" },
  { name: "Dragapult", slug: "dragapult", role: "attacker" },
  { name: "Duraludon", slug: "duraludon", role: "attacker" },
  { name: "Espeon", slug: "espeon", role: "attacker" },
  { name: "Gardevoir", slug: "gardevoir", role: "attacker" },
  { name: "Glaceon", slug: "glaceon", role: "attacker" },
  { name: "Greninja", slug: "greninja", role: "attacker" },
  { name: "Inteleon", slug: "inteleon", role: "attacker" },
  { name: "Latios", slug: "latios", role: "attacker" },
  { name: "Mewtwo Y", slug: "mewtwo", role: "attacker" },
  { name: "Miraidon", slug: "miraidon", role: "attacker" },
  { name: "Pikachu", slug: "pikachu", role: "attacker" },
  { name: "Sylveon", slug: "sylveon", role: "attacker" },
  { name: "Tinkaton", slug: "tinkaton", role: "attacker" },
  { name: "Venusaur", slug: "venusaur", role: "attacker" },

  // All-Rounders
  { name: "Aegislash", slug: "aegislash", role: "all-rounder" },
  { name: "Azumarill", slug: "azumarill", role: "all-rounder" },
  { name: "Blaziken", slug: "blaziken", role: "all-rounder" },
  { name: "Buzzwole", slug: "buzzwole", role: "all-rounder" },
  { name: "Ceruledge", slug: "ceruledge", role: "all-rounder" },
  { name: "Charizard", slug: "charizard", role: "all-rounder" },
  { name: "Charizard X", slug: "charizard", role: "all-rounder" },
  { name: "Mega Lucario", slug: "lucario", role: "all-rounder" },
  { name: "Mega Gyarados", slug: "gyarados", role: "all-rounder" },
  { name: "Sirfetch'd", slug: "sirfetchd", role: "all-rounder" },
  { name: "Dragonite", slug: "dragonite", role: "all-rounder" },
  { name: "Empoleon", slug: "empoleon", role: "all-rounder" },
  { name: "Falinks", slug: "falinks", role: "all-rounder" },
  { name: "Garchomp", slug: "garchomp", role: "all-rounder" },
  { name: "Gyarados", slug: "gyarados", role: "all-rounder" },
  { name: "Lucario", slug: "lucario", role: "all-rounder" },
  { name: "Machamp", slug: "machamp", role: "all-rounder" },
  
  { name: "Metagross", slug: "metagross", role: "all-rounder" },
  { name: "Mewtwo X", slug: "mewtwo", role: "all-rounder" },
  { name: "Pawmot", slug: "pawmot", role: "all-rounder" },
  { name: "Scizor", slug: "scizor", role: "all-rounder" },
  { name: "Suicune", slug: "suicune", role: "all-rounder" },
  { name: "Tsareena", slug: "tsareena", role: "all-rounder" },
  { name: "Tyranitar", slug: "tyranitar", role: "all-rounder" },
  { name: "Urshifu", slug: "urshifu", role: "all-rounder" },
  { name: "Zacian", slug: "zacian", role: "all-rounder" },

  // Speedsters
  { name: "Absol", slug: "absol", role: "speedster" },
  { name: "Darkrai", slug: "darkrai", role: "speedster" },
  { name: "Dodrio", slug: "dodrio", role: "speedster" },
  { name: "Galarian Rapidash", slug: "galarian-rapidash", role: "speedster" },
  { name: "Gengar", slug: "gengar", role: "speedster" },
  { name: "Latias", slug: "latias", role: "speedster" },
  { name: "Leafeon", slug: "leafeon", role: "speedster" },
  { name: "Meowscarada", slug: "meowscarada", role: "speedster" },
  { name: "Meowth", slug: "meowth", role: "speedster" },
  { name: "Mew", slug: "mew", role: "speedster" },
  { name: "Mimikyu", slug: "mimikyu", role: "speedster" },
  { name: "Sceptile", slug: "sceptile", role: "speedster" },
  { name: "Talonflame", slug: "talonflame", role: "speedster" },
  { name: "Zeraora", slug: "zeraora", role: "speedster" },
  { name: "Zoroark", slug: "zoroark", role: "speedster" },

  // Defenders
  { name: "Blastoise", slug: "blastoise", role: "defender" },
  { name: "Crustle", slug: "crustle", role: "defender" },
  { name: "Dhelmise", slug: "dhelmise", role: "defender" },
  { name: "Goodra", slug: "goodra", role: "defender" },
  { name: "Greedent", slug: "greedent", role: "defender" },
  { name: "Ho-Oh", slug: "ho-oh", role: "defender" },
  { name: "Lapras", slug: "lapras", role: "defender" },
  { name: "Mr. Mime", slug: "mr-mime", role: "defender" },
  { name: "Slowbro", slug: "slowbro", role: "defender" },
  { name: "Snorlax", slug: "snorlax", role: "defender" },
  { name: "Trevenant", slug: "trevenant", role: "defender" },
  { name: "Umbreon", slug: "umbreon", role: "defender" },

  // Supporters
  { name: "Alcremie", slug: "alcremie", role: "supporter" },
  { name: "Blissey", slug: "blissey", role: "supporter" },
  { name: "Clefable", slug: "clefable", role: "supporter" },
  { name: "Comfey", slug: "comfey", role: "supporter" },
  { name: "Eldegoss", slug: "eldegoss", role: "supporter" },
  { name: "Hoopa", slug: "hoopa", role: "supporter" },
  { name: "Psyduck", slug: "psyduck", role: "supporter" },
  { name: "Sableye", slug: "sableye", role: "supporter" },
  { name: "Vaporeon", slug: "vaporeon", role: "supporter" },
  { name: "Wigglytuff", slug: "wigglytuff", role: "supporter" },
];

// Garante ordem alfabética
POKEMON_DATA.sort((a, b) => a.name.localeCompare(b.name));

export const POKEMON_LIST: string[] = POKEMON_DATA.map((p) => p.name);

const BY_NAME: Map<string, UnitePokemon> = new Map(POKEMON_DATA.map((p) => [p.name, p]));

export function getPokemon(name: string | null | undefined): UnitePokemon | null {
  if (!name) return null;
  return BY_NAME.get(name) ?? null;
}

export function getPokemonRole(name: string | null | undefined): UniteRole | null {
  return getPokemon(name)?.role ?? null;
}

/**
 * Returns the official Pokémon Unite portrait URL for a Pokémon name,
 * or null if unknown. Uses the official Pokémon UNITE site CDN.
 */
export function getPokemonSprite(name: string | null | undefined): string | null {
  const p = getPokemon(name);
  if (!p) return null;
  return `https://unite.pokemon.com/images/pokemon/${p.slug}/roster/roster-${p.slug}.png`;
}
