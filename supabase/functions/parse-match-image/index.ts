// Edge function: extract Pokémon Unite match data from Pokémon Unite screenshots
// using Lovable AI Gateway (multimodal + tool calling).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOOL = {
  type: "function",
  function: {
    name: "extract_match_data",
    description:
      "Extract structured Pokémon Unite player-by-player match data from one or more post-match screenshots.",
    parameters: {
      type: "object",
      properties: {
        score_us: {
          type: "number",
          description: "Total points scored by the team on the LEFT/ALLY side (Orange/Purple)",
        },
        score_them: {
          type: "number",
          description: "Total points scored by the team on the RIGHT/ENEMY side",
        },
        result: {
          type: "string",
          enum: ["win", "loss", "draw", "unknown"],
          description: "Outcome from the perspective of the ally team",
        },
        ally_players: {
          type: "array",
          description: "Exactly the ally players visible in the screenshots, normally 5 players on the left/ally side.",
          items: { $ref: "#/$defs/player" },
        },
        opponent_players: {
          type: "array",
          description: "Exactly the opponent players visible in the screenshots, normally 5 players on the right/enemy side.",
          items: { $ref: "#/$defs/player" },
        },
        confidence: {
          type: "number",
          description: "Overall confidence 0..1 in the extracted data",
        },
      },
      required: ["score_us", "score_them", "result", "ally_players", "opponent_players"],
      $defs: {
        player: {
          type: "object",
          properties: {
            name: { type: "string", description: "In-game name (IGN) shown on screen or best match from the provided candidate list" },
            pokemon: { type: "string", description: "Pokémon name in English (e.g. Pikachu, Mr. Mime)" },
            kills: { type: "number", description: "KOs/kills shown for this player" },
            deaths: { type: "number", description: "Deaths/faints shown for this player, or 0 if not visible" },
            assists: { type: "number", description: "Assists shown for this player" },
            score: { type: "number", description: "Goals/points scored by this player" },
            damage_dealt: { type: "number", description: "Damage dealt / dano causado / DMG dealt. Convert K notation to full integer." },
            damage_taken: { type: "number", description: "Damage taken / dano recebido / DMG taken. Convert K notation to full integer." },
            healing: { type: "number", description: "Recovery / recuperação / healing. Convert K notation to full integer." },
            is_mvp: { type: "boolean", description: "True only for the player marked with the MVP/crown badge" },
          },
          required: ["name", "pokemon", "kills", "deaths", "assists", "score", "damage_dealt", "damage_taken", "healing", "is_mvp"],
        },
      },
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

    return json({ data: parsed });
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
    "  • PRINT DE PLACAR / PARTIDA: contém as duas equipes, Pokémon, nome/IGN, KOs/Kills, Assists, Score/Pontos e MVP/coroa.",
    "  • PRINT DE ESTATÍSTICAS / BATTLE PERFORMANCE: contém Damage dealt/Dano causado, Damage taken/Dano recebido e Recovery/Healing/Recuperação por jogador.",
    "COMO LER:",
    "  1) Identifique as 10 linhas de jogadores: aliados no lado esquerdo/superior do time do usuário e oponentes no lado direito/inferior conforme a tela.",
    "  2) Para cada linha, leia o nome/IGN próximo ao avatar/Pokémon. Use candidatos do roster somente para corrigir/selecionar nomes parecidos; não invente nomes ausentes.",
    "  3) Extraia KOs/Kills, Assists, Score/Pontos e MVP do print de placar. Deaths/faints use 0 se não existir coluna visível.",
    "  4) Extraia dano causado, dano recebido e recuperação do print de estatísticas. Os números podem aparecer como 72,345, 72.345, 72K ou 72k; retorne inteiro completo.",
    "  5) Quando houver 2 prints, case/una jogadores por nome/IGN; se o nome estiver truncado, use Pokémon e posição relativa da linha para mesclar.",
    "  6) score_us e score_them são o placar grande dos TIMES; score de cada jogador é a pontuação individual marcada.",
    "REGRAS CRÍTICAS:",
    "  • Retorne ally_players e opponent_players com todas as linhas visíveis, idealmente 5 em cada lado.",
    "  • Nunca responda só o placar se houver linhas de jogadores visíveis.",
    "  • Nunca zere todos os jogadores quando as colunas existem; leia célula por célula.",
    "  • Se um campo não estiver visível em nenhum print, use 0, mas mantenha nome, Pokémon e demais campos lidos.",
    "  • Pokémon sempre em inglês.",
    allyCandidates ? `CANDIDATOS DO NOSSO ROSTER para mapeamento de aliados:\n${allyCandidates}` : "",
    opponentCandidates ? `CANDIDATOS DE JOGADORES OPONENTES conhecidos:\n${opponentCandidates}` : "",
  ].filter(Boolean).join("\n");
}

function buildUserPrompt(imageCount: number, allyRoster: any[], opponentRoster: any[]) {
  return [
    `Foram enviados ${imageCount} print(s) da mesma partida de Pokémon Unite.`,
    "Extraia obrigatoriamente por jogador: name, pokemon, kills, deaths, assists, score, damage_dealt, damage_taken, healing e is_mvp.",
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
