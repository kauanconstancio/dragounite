// Edge function: extract Pokémon Unite match data from Pokémon Unite screenshots
// using Lovable AI Gateway (multimodal + tool calling).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const POKEMON_NAMES = [
  "", "Absol", "Aegislash", "Alcremie", "Armarouge", "Articuno", "Azumarill", "Blastoise", "Blaziken", "Blissey",
  "Buzzwole", "Ceruledge", "Chandelure", "Charizard", "Cinderace", "Clefable", "Comfey", "Cramorant", "Crustle",
  "Darkrai", "Decidueye", "Delphox", "Dhelmise", "Dodrio", "Dragapult", "Dragonite", "Duraludon", "Eldegoss",
  "Empoleon", "Espeon", "Falinks", "Garchomp", "Gardevoir", "Gengar", "Glaceon", "Goodra", "Greedent", "Greninja",
  "Gyarados", "Ho-Oh", "Hoopa", "Inteleon", "Lapras", "Latias", "Latios", "Leafeon", "Lucario", "Machamp",
  "Mamoswine", "Mega Charizard X", "Mega Charizard Y", "Mega Gyarados", "Mega Lucario", "Meowscarada", "Meowth", "Metagross",
  "Mew", "Mewtwo X", "Mewtwo Y", "Mimikyu", "Miraidon", "Moltres", "Mr. Mime", "Ninetales", "Pawmot", "Pikachu",
  "Psyduck", "Raichu", "Rapidash", "Sableye", "Scizor", "Scyther", "Sirfetch'd", "Slowbro", "Snorlax", "Suicune",
  "Sylveon", "Talonflame", "Tinkaton", "Trevenant", "Tsareena", "Typhlosion", "Tyranitar", "Umbreon", "Urshifu",
  "Vaporeon", "Venusaur", "Wigglytuff", "Zacian", "Zapdos", "Zeraora", "Zoroark",
] as const;

const POKEMON_VISUAL_GUIDE = [
  "Absol=white quadruped with black crescent/scythe horn; Aegislash=gold sword and shield; Alcremie=cream dessert swirl; Armarouge=red/yellow armored cannon knight; Articuno=blue ice bird; Azumarill=round blue rabbit with long ears; Blastoise=blue turtle with shell cannons; Blaziken=red/yellow fire chicken humanoid; Blissey=pink egg nurse; Buzzwole=red muscular mosquito",
  "Ceruledge=dark purple/blue ghost knight with blade arms; Chandelure=purple chandelier ghost; Charizard/Mega Charizard=orange or black dragon with wings; Cinderace=white/red soccer rabbit; Clefable=pink fairy with curled ears/wings; Comfey=small flower lei wreath; Cramorant=blue bird; Crustle=orange crab under square rock; Darkrai=black shadow with white head plume; Decidueye=brown/green owl archer hood",
  "Delphox=red/orange fox mage holding branch; Dhelmise=anchor/ship wheel ghost; Dodrio=three-headed brown ostrich; Dragapult=purple/teal stealth dragon; Dragonite=orange friendly dragon; Duraludon=gray steel skyscraper dragon; Eldegoss=green body with large white cotton puff; Empoleon=blue penguin with trident face; Espeon=purple cat with forked tail; Falinks=line/group of small helmet soldiers",
  "Garchomp=blue/red land shark with head fins; Gardevoir=white/green elegant gown humanoid; Gengar=round purple grin ghost; Glaceon=light blue ice fox with diamond ears; Goodra=purple gooey dragon with green accents; Greedent=round brown squirrel; Greninja=blue ninja frog with tongue scarf; Gyarados/Mega Gyarados=large blue sea serpent; Ho-Oh=red/gold rainbow phoenix; Hoopa=purple genie with gold rings",
  "Inteleon=tall slim blue lizard/sniper; Lapras=blue plesiosaur with shell; Latias=red/white jet dragon; Latios=blue/white jet dragon; Leafeon=tan/green leaf-eared fox; Lucario/Mega Lucario=blue/black jackal with spikes; Machamp=blue/gray four-armed fighter; Mamoswine=brown mammoth with tusks; Meowscarada=green masked magician cat; Meowth=cream cat with coin on forehead",
  "Metagross=blue steel X-faced four-legged robot; Mew=small pink floating cat; Mewtwo X=muscular psychic humanoid with purple tail; Mewtwo Y=slender psychic with head-tail; Mimikyu=ragged yellow Pikachu disguise; Miraidon=purple/red futuristic lizard bike; Moltres=orange/red flame bird; Mr. Mime=pink/white mime with blue hair; Ninetales=white/blue icy fox with many tails; Pawmot=orange/yellow electric marmot",
  "Pikachu/Raichu=yellow/orange electric mouse with long ears; Psyduck=yellow duck holding head; Rapidash=cream horse with flames; Sableye=small dark purple goblin with gem eyes; Scizor=red metal mantis claws; Scyther=green mantis with blade arms; Sirfetch'd=white duck knight with leek sword/shield; Slowbro=pink biped with Shellder tail; Snorlax=large blue/cream sleeping bear; Suicune=blue feline with purple mane and white ribbons",
  "Sylveon=pink/white ribbon fox; Talonflame=red/gray falcon; Tinkaton=pink fairy carrying giant hammer; Trevenant=brown tree ghost; Tsareena=green/red queen plant with crown leaves; Typhlosion=cream/navy badger with fire collar; Tyranitar=green armored dinosaur; Umbreon=black fox with yellow rings; Urshifu=black/white martial bear; Vaporeon=blue aquatic fox with fin collar; Venusaur=green dino with huge pink flower; Wigglytuff=pink round rabbit-like singer; Zacian=blue wolf with sword; Zapdos=yellow spiky electric bird; Zeraora=yellow/black electric cat; Zoroark=black/red illusion fox",
].join("; ");

const PLAYER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string", description: "In-game name/IGN exactly as shown, or the closest roster candidate when clearly matching" },
    pokemon: { type: "string", enum: POKEMON_NAMES, description: `Choose EXACTLY one Pokémon from the enum, or EMPTY string if not visually certain. Identify ONLY by the small circular portrait/sprite on the same row as the player's name. NEVER guess from IGN, roster, main Pokémon, lane, score, level, or row position. Visual guide: ${POKEMON_VISUAL_GUIDE}` },
    kills: { type: "number", description: "KOs/Nocautes — coluna 'KOs' do placar. Número INTEIRO pequeno, normalmente entre 0 e 20. NÃO confunda com 'Scored/Pontuação' (que costuma ser muito maior)." },
    assists: { type: "number", description: "Assistências — coluna 'Assists/Assistências' do placar. Número INTEIRO pequeno, normalmente entre 0 e 25. NÃO confunda com KOs nem com Scored." },
    score: { type: "number", description: "Pontuação individual marcada — coluna 'Scored/Pontuação' do placar (pontos depositados nos goals). Costuma ser o MAIOR dos três números (frequentemente 30-200+). NÃO confunda com KOs ou Assists." },
    damage_dealt: { type: "number", description: "Damage dealt / dano causado as a full integer" },
    damage_taken: { type: "number", description: "Damage taken / dano recebido as a full integer" },
    healing: { type: "number", description: "Recovery/healing/recuperação as a full integer" },
    is_mvp: { type: "boolean", description: "TRUE ONLY for the player who has a CROWN icon (👑) drawn next to their name. Pokémon Unite shows a small golden/yellow crown above or next to the MVP's IGN. There is exactly ONE MVP per match (winning team). All other players MUST be false." },
  },
  required: ["name", "pokemon", "kills", "assists", "score", "damage_dealt", "damage_taken", "healing", "is_mvp"],
};

const TOOL = {
  type: "function",
  function: {
    name: "extract_match_data",
    description:
      "Extract structured Pokémon Unite player-by-player match data from one or more post-match screenshots.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        score_us: {
          type: "number",
          description: "Total points scored by the ally/team-left side",
        },
        score_them: {
          type: "number",
          description: "Total points scored by the opponent/team-right side",
        },
        result: {
          type: "string",
          enum: ["win", "loss", "draw", "unknown"],
          description: "Outcome from the perspective of the ally team",
        },
        ally_players: {
          type: "array",
          minItems: 1,
          maxItems: 5,
          description: "Ally players as JSON objects, not strings. Usually exactly 5.",
          items: PLAYER_SCHEMA,
        },
        opponent_players: {
          type: "array",
          minItems: 1,
          maxItems: 5,
          description: "Opponent players as JSON objects, not strings. Usually exactly 5.",
          items: PLAYER_SCHEMA,
        },
        confidence: {
          type: "number",
          description: "Overall confidence 0..1 in the extracted data",
        },
      },
      required: ["score_us", "score_them", "result", "ally_players", "opponent_players", "confidence"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return json({ error: "LOVABLE_API_KEY ausente" }, 500);
    }

    const body = await req.json();
    const allyRoster = Array.isArray(body?.allyRoster) ? body.allyRoster : [];
    const opponentRoster = Array.isArray(body?.opponentRoster) ? body.opponentRoster : [];
    // Accept either { images: [{base64, mimeType}, ...] } or legacy { imageBase64, mimeType }
    let images: { base64: string; mimeType: string }[] = [];
    if (Array.isArray(body?.images) && body.images.length > 0) {
      images = body.images
        .filter((i: any) => i && typeof i.base64 === "string")
        .map((i: any) => ({
          base64: i.base64,
          mimeType:
            typeof i.mimeType === "string" && i.mimeType.startsWith("image/")
              ? i.mimeType
              : "image/png",
        }));
    } else if (typeof body?.imageBase64 === "string") {
      images = [
        {
          base64: body.imageBase64,
          mimeType:
            typeof body.mimeType === "string" && body.mimeType.startsWith("image/")
              ? body.mimeType
              : "image/png",
        },
      ];
    }
    if (images.length === 0) {
      return json({ error: "Envie ao menos uma imagem" }, 400);
    }
    if (images.length > 3) {
      return json({ error: "Máximo de 3 imagens por chamada" }, 400);
    }
    for (const img of images) {
      if (img.base64.length > 7_500_000) {
        return json({ error: "Uma das imagens é muito grande (máx ~5MB cada)" }, 413);
      }
    }
    const imageParts = images.map((img) => ({
      type: "image_url" as const,
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
    }));

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(allyRoster, opponentRoster),
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: buildUserPrompt(images.length, allyRoster, opponentRoster),
              },
              ...imageParts,
            ],
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "extract_match_data" } },
        temperature: 0.1,
        max_tokens: 8192,
      }),
    });

    if (aiRes.status === 429) {
      return json({ error: "Limite de requisições atingido. Tente em alguns segundos." }, 429);
    }
    if (aiRes.status === 402) {
      return json({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }, 402);
    }
    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, text);
      return json({ error: "Falha ao processar imagem" }, 500);
    }

    const data = await aiRes.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return json({ error: "IA não retornou dados estruturados" }, 502);
    }
    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return json({ error: "Resposta inválida da IA" }, 502);
    }

    const normalized = normalizeExtractedMatch(parsed);
    return json({ data: normalized });
  } catch (e) {
    console.error("parse-match-image error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildSystemPrompt(allyRoster: any[], opponentRoster: any[]) {
  const allyCandidates = formatCandidates(allyRoster);
  const opponentCandidates = formatCandidates(opponentRoster);
  return [
    "Você é um extrator OCR/visão especializado em resultados pós-partida de Pokémon Unite.",
    "Sua prioridade é extrair DADOS POR JOGADOR, não apenas o placar geral.",
    "A partida pode estar em PT-BR, EN ou ES. O usuário pode enviar 1 ou 2 prints da MESMA partida:",
    "  • PRINT DE PLACAR / PARTIDA: contém as duas equipes, Pokémon, nome/IGN, KOs/Kills, Assists, Score/Pontos e o ícone de COROA do MVP.",
    "  • PRINT DE ESTATÍSTICAS / BATTLE PERFORMANCE: contém Damage dealt/Dano causado, Damage taken/Dano recebido e Recovery/Healing/Recuperação por jogador.",
    "COMO LER:",
    "  1) Identifique as 10 linhas de jogadores: 5 aliados (time do usuário, normalmente lado esquerdo/laranja) e 5 oponentes (lado direito/roxo).",
    "  2) POKÉMON — IDENTIFICAÇÃO VISUAL OBRIGATÓRIA E CONSERVADORA: Cada linha tem um sprite/retrato circular do Pokémon usado, normalmente à ESQUERDA do nome do jogador. Primeiro localize os 10 retratos circulares; depois leia cada retrato na MESMA LINHA do IGN. Você DEVE identificar o Pokémon olhando APENAS para esse sprite — observe cor predominante, silhueta, orelhas, cauda, asas, armas/objetos e características marcantes. NUNCA, em hipótese alguma, infira o Pokémon a partir do nome/IGN do jogador, do nível, da lane, do roster, do main cadastrado, da pontuação ou da posição na tabela. Se o IGN sugere um Pokémon mas o sprite mostra outro, CONFIE NO SPRITE. Se o sprite estiver borrado, cortado, pequeno demais ou ambíguo entre dois Pokémon, retorne string VAZIA — É MELHOR DEIXAR VAZIO DO QUE ADIVINHAR ERRADO.",
    `  2b) LISTA FECHADA DE NOMES PERMITIDOS: ${POKEMON_NAMES.filter(Boolean).join(", ")}. Não retorne nomes fora dessa lista. Use "Ninetales" para Alolan Ninetales/A9. Diferencie Mewtwo X de Mewtwo Y e Mega formas somente quando o retrato mostrar claramente a forma; se não, deixe vazio.`,
    `  2c) GUIA VISUAL DOS RETRATOS: ${POKEMON_VISUAL_GUIDE}`,
    "  3) Nome/IGN próximo ao avatar/Pokémon. Use candidatos do roster apenas para corrigir/selecionar nomes parecidos; não invente nomes ausentes.",
    "  4) MVP: Pokémon Unite mostra um ícone pequeno de COROA DOURADA (👑) acima ou ao lado do IGN do MVP. Existe APENAS UM MVP por partida, sempre no time vencedor. Marque is_mvp=true SOMENTE para esse jogador. Todos os outros 9 jogadores DEVEM ter is_mvp=false. Se nenhuma coroa for visível, todos ficam false.",
    "  5) COLUNAS NUMÉRICAS — leia os CABEÇALHOS da tabela antes de atribuir valores. No print de placar do Pokémon Unite as colunas aparecem nesta ORDEM PADRÃO da esquerda para a direita: 'Scored / Pontuação' (pontos individuais marcados, costuma ser o MAIOR número, podendo passar de 100), depois 'KOs / Nocautes' (kills, geralmente número pequeno 0-20), depois 'Assists / Assistências' (geralmente número pequeno 0-25). NUNCA troque essas colunas. Se houver dúvida, lembre: Score >> Kills e Assists na maioria dos casos; Kills e Assists raramente passam de 30. Confirme cada número casando-o com o cabeçalho da coluna correspondente, célula por célula, linha por linha.",
    "  5b) NÃO existe coluna de mortes/deaths no Pokémon Unite — não tente extrair.",
    "  6) Extraia dano causado, dano recebido e recuperação do print de estatísticas. Os números podem aparecer como 72,345, 72.345, 72K ou 72k; retorne inteiro completo.",
    "  7) Quando houver 2 prints, case/una jogadores por nome/IGN; se o nome estiver truncado, use Pokémon e posição relativa da linha para mesclar.",
    "  8) score_us e score_them são o placar grande dos TIMES; score de cada jogador é a pontuação individual marcada.",
    "REGRAS CRÍTICAS:",
    "  • Retorne ally_players e opponent_players com todas as linhas visíveis, idealmente 5 em cada lado.",
    "  • Nunca responda só o placar se houver linhas de jogadores visíveis.",
    "  • Nunca zere todos os jogadores quando as colunas existem; leia célula por célula.",
    "  • Se um campo não estiver visível em nenhum print, use 0, mas mantenha nome, Pokémon e demais campos lidos.",
    "  • Pokémon sempre em inglês e exatamente como na lista fechada (ex: Pikachu, Lucario, Tsareena, Mr. Mime, Ninetales).",
    "  • Apenas UM jogador no total (entre os 10) pode ter is_mvp=true.",
    allyCandidates ? `CANDIDATOS DO NOSSO ROSTER para mapeamento de aliados:\n${allyCandidates}` : "",
    opponentCandidates ? `CANDIDATOS DE JOGADORES OPONENTES conhecidos:\n${opponentCandidates}` : "",
  ].filter(Boolean).join("\n");
}

function buildUserPrompt(imageCount: number, allyRoster: any[], opponentRoster: any[]) {
  return [
    `Foram enviados ${imageCount} print(s) da mesma partida de Pokémon Unite.`,
    "Extraia obrigatoriamente por jogador: name, pokemon, kills, assists, score, damage_dealt, damage_taken, healing e is_mvp.",
    "NÃO extraia mortes/deaths — Pokémon Unite não exibe essa coluna.",
    "Para o Pokémon, faça uma leitura visual cuidadosa do RETRATO/SPRITE circular ao lado do nome, linha por linha. Retorne apenas nomes da lista permitida; se não tiver certeza visual, deixe pokemon como string vazia. Não copie o main do roster e não invente a partir do IGN.",
    "Para o MVP, procure pela COROA DOURADA (👑) ao lado de UM IGN — apenas esse jogador recebe is_mvp=true.",
    "Separe aliados em ally_players e adversários em opponent_players.",
    "Se houver print de estatísticas detalhadas, mescle dano/recuperação no mesmo jogador do print de placar.",
    allyRoster.length ? "Para aliados, prefira nomes que coincidam com name/ign do roster enviado quando forem claramente o mesmo jogador." : "",
    opponentRoster.length ? "Para oponentes, prefira nomes conhecidos quando coincidirem com o print." : "",
  ].filter(Boolean).join("\n");
}

function formatCandidates(candidates: any[]) {
  return candidates
    .slice(0, 20)
    .map((p, index) => {
      const bits = [
        `#${index + 1}`,
        p?.name ? `name=${String(p.name)}` : "",
        p?.ign ? `ign=${String(p.ign)}` : "",
        // NÃO incluir 'pokemon' do roster aqui — evita que a IA copie o "main" em vez de ler o sprite real do print.
      ].filter(Boolean);
      return bits.join("; ");
    })
    .filter(Boolean)
    .join("\n");
}

type ExtractedPlayer = {
  name: string;
  pokemon: string;
  kills: number;
  assists: number;
  score: number;
  damage_dealt: number;
  damage_taken: number;
  healing: number;
  is_mvp: boolean;
};

function normalizeExtractedMatch(raw: any) {
  const allyPlayers = normalizePlayers(raw?.ally_players);
  const opponentPlayers = normalizePlayers(raw?.opponent_players);
  const scoreUs = toNumber(raw?.score_us) || allyPlayers.reduce((sum, p) => sum + p.score, 0);
  const scoreThem = toNumber(raw?.score_them) || opponentPlayers.reduce((sum, p) => sum + p.score, 0);
  const result = raw?.result === "win" || raw?.result === "loss" || raw?.result === "draw"
    ? raw.result
    : scoreUs > scoreThem
      ? "win"
      : scoreThem > scoreUs
        ? "loss"
        : scoreUs === scoreThem && (scoreUs > 0 || scoreThem > 0)
          ? "draw"
          : "unknown";

  enforceSingleMvp(allyPlayers, opponentPlayers, result);

  return {
    score_us: scoreUs,
    score_them: scoreThem,
    result,
    ally_players: allyPlayers,
    opponent_players: opponentPlayers,
    confidence: typeof raw?.confidence === "number" ? raw.confidence : 0.75,
  };
}

function enforceSingleMvp(ally: ExtractedPlayer[], opp: ExtractedPlayer[], result: string) {
  const allMvps = [...ally, ...opp].filter((p) => p.is_mvp);
  if (allMvps.length <= 1) return;
  const winners = result === "loss" ? opp : result === "win" ? ally : [...ally, ...opp];
  const candidates = winners.filter((p) => p.is_mvp);
  const pool = candidates.length ? candidates : allMvps;
  const best = pool.reduce((a, b) =>
    (b.score + b.kills * 2 + b.assists) > (a.score + a.kills * 2 + a.assists) ? b : a,
  );
  for (const p of [...ally, ...opp]) {
    p.is_mvp = p === best;
  }
}

function normalizePlayers(value: any): ExtractedPlayer[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizePlayer(entry))
    .filter((p) => p.name || p.pokemon || p.kills || p.assists || p.score || p.damage_dealt || p.damage_taken || p.healing)
    .slice(0, 5);
}

function normalizePlayer(entry: any): ExtractedPlayer {
  const parsed = typeof entry === "string" ? parsePlayerString(entry) : entry ?? {};
  return {
    name: String(parsed.name ?? parsed.ign ?? parsed.player_name ?? "").trim(),
    pokemon: normalizePokemonName(parsed.pokemon),
    kills: toNumber(parsed.kills ?? parsed.ko ?? parsed.kos ?? parsed.KO),
    assists: toNumber(parsed.assists ?? parsed.assistencias ?? parsed.assistências),
    score: toNumber(parsed.score ?? parsed.points ?? parsed.pontos),
    damage_dealt: toNumber(parsed.damage_dealt ?? parsed.damageDealt ?? parsed.dano_causado ?? parsed.dano),
    damage_taken: toNumber(parsed.damage_taken ?? parsed.damageTaken ?? parsed.dano_recebido ?? parsed.sofrido),
    healing: toNumber(parsed.healing ?? parsed.recovery ?? parsed.recuperacao ?? parsed.recuperação ?? parsed.cura),
    is_mvp: toBoolean(parsed.is_mvp ?? parsed.mvp),
  };
}

function normalizePokemonName(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const normalized = normalizeKey(raw.replace(/^alolan\s+/i, ""));
  const aliases: Record<string, string> = {
    a9: "Ninetales",
    alolanninetales: "Ninetales",
    ninetails: "Ninetales",
    mrmime: "Mr. Mime",
    "mr.mime": "Mr. Mime",
    mime: "Mr. Mime",
    mewtwox: "Mewtwo X",
    mewtwoy: "Mewtwo Y",
    megacharizardx: "Mega Charizard X",
    megacharizardy: "Mega Charizard Y",
    megagyarados: "Mega Gyarados",
    megalucario: "Mega Lucario",
    sirfetchd: "Sirfetch'd",
    sirfetch: "Sirfetch'd",
    hooh: "Ho-Oh",
  };
  if (aliases[normalized]) return aliases[normalized];
  const exact = POKEMON_NAMES.find((name) => normalizeKey(name) === normalized);
  return exact ?? "";
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function parsePlayerString(input: string) {
  const out: Record<string, unknown> = {};
  const normalized = input.replace(/\bFalse\b/g, "false").replace(/\bTrue\b/g, "true");
  const knownKeys = [
    "damage_dealt",
    "damage_taken",
    "is_mvp",
    "name",
    "ign",
    "player_name",
    "pokemon",
    "kills",
    "assists",
    "score",
    "healing",
    "recovery",
    "dano_causado",
    "dano_recebido",
    "recuperacao",
    "recuperação",
    "cura",
    "mvp",
  ];
  const keyPattern = knownKeys.map(escapeRegExp).join("|");
  const regex = new RegExp(`(?:^|[,;]\\s*)(${keyPattern})\\s*=\\s*([\\s\\S]*?)(?=(?:[,;]\\s*(?:${keyPattern})\\s*=)|$)`, "gi");
  for (const match of normalized.matchAll(regex)) {
    const key = match[1].toLowerCase();
    const value = match[2].trim().replace(/^['\"]|['\"]$/g, "");
    out[key] = value;
  }
  return out;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== "string") return 0;
  const compact = value.trim().toLowerCase().replace(/\s/g, "");
  if (!compact) return 0;
  const multiplier = compact.endsWith("k") ? 1000 : 1;
  const cleaned = compact
    .replace(/k$/, "")
    .replace(/[^0-9.,-]/g, "")
    .replace(/[.,](?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * multiplier)) : 0;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return false;
  return ["true", "1", "yes", "sim", "mvp"].includes(value.trim().toLowerCase());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
