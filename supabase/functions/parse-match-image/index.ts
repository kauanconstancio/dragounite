// Edge function: extract Pokémon Unite match scoreboard data from a screenshot
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
      "Extract structured Pokémon Unite scoreboard data from a screenshot of the post-match results screen.",
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
          description: "Up to 5 ally players (left side / your team)",
          items: { $ref: "#/$defs/player" },
        },
        opponent_players: {
          type: "array",
          description: "Up to 5 opponent players (right side / enemy team)",
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
            name: { type: "string", description: "In-game name (IGN) shown on screen" },
            pokemon: { type: "string", description: "Pokémon name in English (e.g. Pikachu, Mr. Mime)" },
            kills: { type: "number" },
            deaths: { type: "number" },
            assists: { type: "number" },
            score: { type: "number", description: "Goals/points scored by this player" },
            damage_dealt: { type: "number" },
            damage_taken: { type: "number" },
            healing: { type: "number" },
            is_mvp: { type: "boolean" },
          },
          required: ["name", "kills", "deaths", "assists", "score"],
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
            content: [
              "Você é um extrator preciso de placar pós-partida de Pokémon Unite.",
              "A tela pode estar em PT-BR ou EN. O usuário envia 1 ou 2 prints da MESMA partida:",
              "  • TELA 1 (placar/resultado): mostra o pokémon de cada jogador, seu NOME/IGN, KOs (kills), Assists, e os PONTOS marcados (score) por jogador. O ícone de coroa indica MVP.",
              "  • TELA 2 (estatísticas detalhadas / 'Battle performance'): mostra colunas como Dano causado (Damage dealt), Dano sofrido (Damage taken) e Cura (Healing) por jogador.",
              "REGRAS CRÍTICAS:",
              "  1) SEMPRE retorne uma linha por jogador visível — 5 aliados (esquerda/laranja) e 5 oponentes (direita/roxo), mesmo que algum campo esteja faltando.",
              "  2) NUNCA retorne todos os campos zerados se houver linhas visíveis — leia coluna por coluna.",
              "  3) score_us / score_them são as somas grandes do topo (placar do time). score por jogador é os pontos marcados pelo jogador individual.",
              "  4) Se houver 2 imagens, CASE os jogadores entre as telas pelo nome/IGN ou pelo pokémon e MESCLE os campos (KDA da tela 1 + dano/cura da tela 2).",
              "  5) Se um campo realmente não está visível em nenhuma tela, use 0. Não invente.",
              "  6) Pokémon sempre em inglês (Pikachu, Mr. Mime, Tsareena, etc.).",
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  images.length > 1
                    ? `Foram enviados ${images.length} prints da MESMA partida (placar + estatísticas detalhadas). Combine ambos e devolva todos os jogadores com KDA, score, dano causado, dano sofrido, cura e MVP.`
                    : "Extraia TODOS os jogadores visíveis com nome/IGN, pokémon, KDA e score. Se a tela de estatísticas detalhadas (dano/cura) não estiver presente, deixe esses campos como 0 — mas NÃO zere KDA/score se eles estiverem visíveis.",
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
