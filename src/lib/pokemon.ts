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

// Serebii Pokémon Unite portrait IDs.
// Most are National Dex numbers (zero-padded to 3 digits).
// Special Unite variants use suffixes (e.g. 150-mx for Mewtwo X).
const POKEMON_UNITE_IDS: Record<string, string> = {
  "Absol": "359", "Aegislash": "681", "Alolan Ninetales": "038-a",
  "Azumarill": "184", "Blastoise": "009", "Blissey": "242",
  "Buzzwole": "794", "Ceruledge": "936", "Chandelure": "609",
  "Charizard": "006", "Cinderace": "815", "Clefable": "036",
  "Comfey": "764", "Cramorant": "845", "Crustle": "558",
  "Decidueye": "724", "Delphox": "655", "Dodrio": "085",
  "Dragapult": "887", "Dragonite": "149", "Duraludon": "884",
  "Eldegoss": "830", "Espeon": "196", "Falinks": "870",
  "Garchomp": "445", "Gardevoir": "282", "Gengar": "094",
  "Glaceon": "471", "Goodra": "706", "Greedent": "820",
  "Greninja": "658", "Gyarados": "130", "Ho-Oh": "250",
  "Hoopa": "720", "Inteleon": "818", "Lapras": "131",
  "Leafeon": "470", "Lucario": "448", "Machamp": "068",
  "Mamoswine": "473", "Mathcamp": "068", "Meowscarada": "908",
  "Metagross": "376", "Mew": "151", "Mewtwo X": "150-mx",
  "Mewtwo Y": "150-my", "Mimikyu": "778", "Miraidon": "1008",
  "Pikachu": "025", "Psyduck": "054", "Sableye": "302",
  "Scizor": "212", "Scyther": "123", "Sylveon": "700",
  "Talonflame": "663", "Trevenant": "709", "Tsareena": "763",
  "Tyranitar": "248", "Umbreon": "197", "Urshifu": "892",
  "Venusaur": "003", "Wigglytuff": "040", "Zacian": "888",
  "Zeraora": "807", "Zoroark": "571",
};

/**
 * Returns the official Pokémon Unite portrait URL for a Pokémon name,
 * or null if unknown. Uses Serebii's Unite portrait CDN.
 */
export function getPokemonSprite(name: string | null | undefined): string | null {
  if (!name) return null;
  const id = POKEMON_UNITE_IDS[name];
  if (!id) return null;
  return `https://www.serebii.net/pokemonunite/pokemon/${id}.png`;
}
