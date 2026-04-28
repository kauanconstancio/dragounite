# Corrigir navegação para a página de detalhes do Pokémon

## Problema

Ao clicar em um Pokémon na página `/builds`, a URL muda para `/builds/Aegislash` mas a tela de detalhes não aparece — continua mostrando a galeria (ou tela em branco).

**Causa raiz:** No TanStack Router, quando existe `builds.tsx` (rota pai) e `builds.$pokemon.tsx` (rota filha), o pai precisa renderizar um `<Outlet />` para que a filha apareça. Hoje o `src/routes/builds.tsx` renderiza a galeria diretamente, sem `<Outlet />`, então a rota filha nunca é montada.

## Solução

Adotar o padrão padrão do TanStack: separar a galeria do layout pai.

### Passos

1. **Renomear** `src/routes/builds.tsx` → `src/routes/builds.index.tsx`
   - Atualizar o `createFileRoute("/builds")` para `createFileRoute("/builds/")` (rota índice).
   - Conteúdo (galeria, busca, filtros) permanece idêntico.

2. **Criar novo** `src/routes/builds.tsx` como layout fino:
   ```tsx
   import { createFileRoute, Outlet } from "@tanstack/react-router";

   export const Route = createFileRoute("/builds")({
     component: () => <Outlet />,
   });
   ```

3. **Não tocar** em `src/routes/builds.$pokemon.tsx` — já está correto.

4. O arquivo `src/routeTree.gen.ts` é regenerado automaticamente pelo plugin do TanStack — não precisa editar manualmente.

## Resultado esperado

- `/builds` → mostra a galeria (via `builds.index.tsx`)
- `/builds/Aegislash` → mostra a página de detalhes do Pokémon (via `builds.$pokemon.tsx`)
- Botão "Voltar" e o `<Link to="/builds">` continuam funcionando normalmente.
