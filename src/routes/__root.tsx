import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/hooks/useAuth";
import { TeamProvider } from "@/hooks/useCurrentTeam";
import { installServerFnAuthFetch } from "@/integrations/supabase/server-fn-fetch";

if (typeof window !== "undefined") {
  installServerFnAuthFetch();
}

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DragoUnite Team Manager — Pokémon Unite" },
      { name: "description", content: "Hub de operações para times de Pokémon Unite: roster, treinos, amistosos e composições." },
      { property: "og:title", content: "DragoUnite Team Manager — Pokémon Unite" },
      { name: "twitter:title", content: "DragoUnite Team Manager — Pokémon Unite" },
      { property: "og:description", content: "Hub de operações para times de Pokémon Unite: roster, treinos, amistosos e composições." },
      { name: "twitter:description", content: "Hub de operações para times de Pokémon Unite: roster, treinos, amistosos e composições." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9482d3d0-c153-4279-9d79-a5a89329eb4e/id-preview-b799cdd0--c926536d-e112-4c84-933c-50b0d0bec906.lovable.app-1776836265683.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9482d3d0-c153-4279-9d79-a5a89329eb4e/id-preview-b799cdd0--c926536d-e112-4c84-933c-50b0d0bec906.lovable.app-1776836265683.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="font-display text-7xl text-gold">404</h1>
        <p className="mt-2 text-muted-foreground uppercase tracking-widest text-sm">Página não encontrada</p>
      </div>
    </div>
  );
}

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000 } },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TeamProvider>
          <AppLayout />
          <Toaster />
        </TeamProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
