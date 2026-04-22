export const POKEMON_LIST = [
  "Absol", "Aegislash", "Alolan Ninetales", "Azumarill", "Blastoise", "Blissey",
  "Buzzwole", "Ceruledge", "Chandelure", "Charizard", "Cinderace", "Clefable",
  "Comfey", "Cramorant", "Crustle", "Decidueye", "Delphox", "Dodrio", "Dragapult",
  "Dragonite", "Duraludon", "Eldegoss", "Espeon", "Falinks", "Garchomp",
  "Gardevoir", "Gengar", "Glaceon", "Goodra", "Greedent", "Greninja", "Gyarados",
  "Ho-Oh", "Hoopa", "Inteleon", "Lapras", "Leafeon", "Lucario", "Machamp",
  "Mamoswine", "Mathcamp", "Meowscarada", "Metagross", "Mew", "Mewtwo X", "Mewtwo Y",
  "Mimikyu", "Miraidon", "Pikachu", "Psyduck", "Sableye", "Scizor", "Scyther",
  "Sylveon", "Talonflame", "Trevenant", "Tsareena", "Tyranitar", "Umbreon",
  "Urshifu", "Venusaur", "Wigglytuff", "Zacian", "Zeraora", "Zoroark",
].sort();

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

// PokéAPI National Dex IDs for sprite lookup.
// Special forms map to their base form's ID (sprite is close enough for UI).
const POKEMON_DEX_IDS: Record<string, number> = {
  "Absol": 359, "Aegislash": 681, "Alolan Ninetales": 38, "Azumarill": 184,
  "Blastoise": 9, "Blissey": 242, "Buzzwole": 794, "Ceruledge": 936,
  "Chandelure": 609, "Charizard": 6, "Cinderace": 815, "Clefable": 36,
  "Comfey": 764, "Cramorant": 845, "Crustle": 558, "Decidueye": 724,
  "Delphox": 655, "Dodrio": 85, "Dragapult": 887, "Dragonite": 149,
  "Duraludon": 884, "Eldegoss": 830, "Espeon": 196, "Falinks": 870,
  "Garchomp": 445, "Gardevoir": 282, "Gengar": 94, "Glaceon": 471,
  "Goodra": 706, "Greedent": 820, "Greninja": 658, "Gyarados": 130,
  "Ho-Oh": 250, "Hoopa": 720, "Inteleon": 818, "Lapras": 131,
  "Leafeon": 470, "Lucario": 448, "Machamp": 68, "Mamoswine": 473,
  "Mathcamp": 68, "Meowscarada": 908, "Metagross": 376, "Mew": 151,
  "Mewtwo X": 150, "Mewtwo Y": 150, "Mimikyu": 778, "Miraidon": 1008,
  "Pikachu": 25, "Psyduck": 54, "Sableye": 302, "Scizor": 212,
  "Scyther": 123, "Sylveon": 700, "Talonflame": 663, "Trevenant": 709,
  "Tsareena": 763, "Tyranitar": 248, "Umbreon": 197, "Urshifu": 892,
  "Venusaur": 3, "Wigglytuff": 40, "Zacian": 888, "Zeraora": 807,
  "Zoroark": 571,
};

/**
 * Returns the official sprite URL for a Pokémon name, or null if unknown.
 * Uses PokeAPI's official-artwork sprite (high quality, transparent PNG).
 */
export function getPokemonSprite(name: string | null | undefined): string | null {
  if (!name) return null;
  const id = POKEMON_DEX_IDS[name];
  if (!id) return null;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}
