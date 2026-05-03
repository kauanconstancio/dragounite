## Objetivo

Adicionar um botão "Importar de imagem (IA)" no módulo de Amistosos que permite enviar um print da tela final da partida (Pokémon Unite) e usar IA multimodal para extrair automaticamente: placar, resultado, desempenho dos jogadores (KDA, score, dano, cura, MVP, pokémon escolhido) e preencher os campos correspondentes para revisão antes de salvar.

## Como vai funcionar (visão do usuário)

1. Em `/amistosos`, ao abrir o diálogo de uma scrim já criada (ou em "Performance"), aparece um novo botão **"Importar print (IA)"**.
2. Usuário seleciona uma imagem (PNG/JPG, até ~5MB) — placar final, scoreboard, ou tela de resultado.
3. A imagem é enviada para uma edge function que usa Lovable AI (`google/gemini-2.5-pro` — multimodal) com tool calling para retornar JSON estruturado.
4. Um diálogo de revisão mostra os dados extraídos lado a lado com os campos editáveis. Usuário corrige se necessário e confirma.
5. Os dados são gravados em `scrims` (placar/resultado) e `match_performances` (linha por jogador, por game).

## Mudanças técnicas

### 1. Edge function: `supabase/functions/parse-match-image/index.ts`
- Recebe `{ imageBase64: string, mimeType: string, gameNumber?: number }`.
- Valida tamanho/MIME, exige autenticação (verify_jwt padrão).
- Chama Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) com:
  - Modelo: `google/gemini-2.5-pro` (melhor visão).
  - Mensagem `user` com `image_url` (data URL base64) + instrução.
  - `tools` com schema `extract_match_data` definindo: `score_us`, `score_them`, `result` (win/loss/draw), `players[]` com `{ name, pokemon, kills, deaths, assists, score, damage_dealt, damage_taken, healing, is_mvp }`, `confidence` (0–1).
  - `tool_choice` forçado nessa função.
- Trata 429 (rate limit) e 402 (créditos) retornando mensagens claras.
- Retorna o JSON da tool call.

### 2. Componente: `src/components/scouting/ImportMatchImageDialog.tsx`
- Dialog com input de arquivo + preview da imagem.
- Converte para base64, chama `supabase.functions.invoke("parse-match-image", ...)`.
- Mostra loading e erros (toast).
- Ao receber resposta, abre uma etapa de revisão: placar editável + tabela de jogadores editáveis (selects de pokémon usando `PokemonPicker` existente, inputs numéricos para KDA/score/etc., switch de MVP, mapeamento de cada linha extraída a um `member_id` do roster via Select).
- Botão "Salvar" → executa upsert em `scrims` (placar/resultado/status=completed) e insert múltiplo em `match_performances` para o `scrim_id` + `game_number`.
- Invalida queries de scrims e performances.

### 3. Integração em `src/routes/amistosos.tsx`
- Adicionar botão "Importar print (IA)" em cada card de scrim (junto de "Performance" e "VOD"), visível apenas para `canEditTeam`.
- Abre o `ImportMatchImageDialog` passando `scrimId`, `teamId`, e lista de membros do time.

### 4. Sem mudanças de schema
- `scrims` e `match_performances` já têm todos os campos necessários.

## Pontos de atenção

- **Custo/limites**: Lovable AI usa créditos do workspace. Tratar 402/429 com toasts claros.
- **Precisão**: A IA pode errar nomes/números — por isso a etapa de revisão obrigatória antes de salvar é essencial. Marcar campos com baixa `confidence` em destaque.
- **Idiomas**: o prompt instrui que a tela pode estar em PT-BR ou EN.
- **Privacidade/direitos**: a imagem é processada apenas para extração, não armazenada.
- **Mapeamento de jogadores**: a IA retorna nome/IGN visto na tela; o usuário associa manualmente ao membro do roster (com sugestão automática por similaridade de nome).

## Resumo de arquivos

- **Criar**: `supabase/functions/parse-match-image/index.ts`
- **Criar**: `src/components/scouting/ImportMatchImageDialog.tsx`
- **Editar**: `src/routes/amistosos.tsx` (botão de import por scrim)
- **Editar**: `supabase/config.toml` (registrar a function se necessário)

Aprovando este plano, eu implemento na próxima etapa.