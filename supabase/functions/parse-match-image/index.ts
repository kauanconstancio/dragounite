// Edge function: extract Pokémon Unite match data from Pokémon Unite screenshots
// using Lovable AI Gateway (multimodal + tool calling).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLAYER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string", description: "In-game name/IGN exactly as shown, or the closest roster candidate when clearly matching" },
    pokemon: { type: "string", description: "Pokémon name in English. READ the small portrait/icon next to each row — do NOT guess from the player name. Examples: Pikachu, Charizard, Lucario, Mr. Mime, Mew, Tsareena, Espeon, Gardevoir, Glaceon, Greninja, Cinderace, Decidueye, Dragapult, Mewtwo X, Mewtwo Y, Zacian, Miraidon, Ho-Oh, Suicune, Blissey, Eldegoss, Wigglytuff, Hoopa, Comfey, Sableye, Trevenant, Snorlax, Mamoswine, Crustle, Slowbro, Goodra, Greedent, Umbreon, Buzzwole, Machamp, Tyranitar, Garchomp, Blaziken, Aegislash, Scizor, Absol, Zoroark, Tinkaton, Falinks, Ceruledge, Meowscarada, Inteleon, Leafeon, Sylveon, Delphox, Venusaur, Alolan Ninetales, Duraludon, Dragonite, Metagross, A9 (Alolan Ninetales)" },
    kills: { type: "number", description: "KOs/kills shown for this player" },
    assists: { type: "number", description: "Assists shown for this player" },
    score: { type: "number", description: "Individual points/goals scored by this player" },
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
    "  2) POKÉMON: leia o RETRATO/ÍCONE pequeno ao lado do nome de cada linha. Cada linha tem um sprite circular do Pokémon usado. NUNCA infira o Pokémon a partir do nome do jogador. Se não conseguir identificar com certeza, deixe vazio.",
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
    "  • Pokémon sempre em inglês (ex: Pikachu, Lucario, Tsareena, Mr. Mime, Alolan Ninetales).",
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
    "Para o Pokémon, leia o RETRATO/SPRITE pequeno ao lado do nome — não invente a partir do IGN.",
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
        p?.pokemon ? `pokemon=${String(p.pokemon)}` : "",
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
    pokemon: String(parsed.pokemon ?? "").trim(),
    kills: toNumber(parsed.kills ?? parsed.ko ?? parsed.kos ?? parsed.KO),
    assists: toNumber(parsed.assists ?? parsed.assistencias ?? parsed.assistências),
    score: toNumber(parsed.score ?? parsed.points ?? parsed.pontos),
    damage_dealt: toNumber(parsed.damage_dealt ?? parsed.damageDealt ?? parsed.dano_causado ?? parsed.dano),
    damage_taken: toNumber(parsed.damage_taken ?? parsed.damageTaken ?? parsed.dano_recebido ?? parsed.sofrido),
    healing: toNumber(parsed.healing ?? parsed.recovery ?? parsed.recuperacao ?? parsed.recuperação ?? parsed.cura),
    is_mvp: toBoolean(parsed.is_mvp ?? parsed.mvp),
  };
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
