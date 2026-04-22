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
