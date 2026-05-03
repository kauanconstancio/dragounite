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

    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return json({ error: "imageBase64 obrigatório" }, 400);
    }
    // ~7MB base64 ≈ 5MB binary
    if (imageBase64.length > 7_500_000) {
      return json({ error: "Imagem muito grande (máx ~5MB)" }, 413);
    }
    const mt = typeof mimeType === "string" && mimeType.startsWith("image/") ? mimeType : "image/png";
    const dataUrl = `data:${mt};base64,${imageBase64}`;

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
            content:
              "Você é um extrator preciso de placar pós-partida de Pokémon Unite. " +
              "A tela pode estar em PT-BR ou EN. Extraia exatamente o que está visível. " +
              "Não invente. Se um campo não estiver visível, use 0 ou string vazia. " +
              "O time aliado é geralmente o time da esquerda (laranja). Pokémon em inglês.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extraia o placar e estatísticas de todos os jogadores deste resultado de partida.",
              },
              { type: "image_url", image_url: { url: dataUrl } },
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
