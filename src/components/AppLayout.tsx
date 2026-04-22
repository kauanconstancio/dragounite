import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Users,
  CalendarDays,
  Sparkles,
  Shield,
  Crosshair,
  Map,
  Dumbbell,
  Swords,
  LayoutDashboard,
  Target,
  Megaphone,
  BookOpen,
  ListOrdered,
  Library,
  ChevronDown,
  Bell,
  BellOff,
  LogIn,
  LogOut,
  UserCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

const main = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/roster", label: "Roster", icon: Users },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
];

const operacao = [
  { to: "/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/amistosos", label: "Amistosos", icon: Swords },
  { to: "/oponentes", label: "Oponentes", icon: Target },
  { to: "/mural", label: "Mural", icon: Megaphone },
];

const estrategia = [
  { to: "/composicoes", label: "Composições", icon: Sparkles },
  { to: "/builds", label: "Builds", icon: BookOpen },
  { to: "/draft", label: "Draft", icon: Crosshair },
  { to: "/planner", label: "Planner", icon: Map },
  { to: "/jogadas", label: "Jogadas", icon: Library },
  { to: "/tier-list", label: "Tier List", icon: ListOrdered },
];

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname.startsWith(to);
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [notifEnabled, setNotifEnabled] = useState(false);

  const isAuthRoute = location.pathname === "/auth";

  useEffect(() => {
    if (!loading && !user && !isAuthRoute) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, user, isAuthRoute, navigate]);

  // Polling for upcoming events (only when authenticated)
  const { data: upcoming } = useQuery({
    queryKey: ["upcoming-notif"],
    queryFn: async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 60 * 60 * 1000); // 1h
      const [t, s] = await Promise.all([
        supabase.from("trainings").select("id, title, scheduled_at").gte("scheduled_at", now.toISOString()).lte("scheduled_at", future.toISOString()),
        supabase.from("scrims").select("id, opponent, scheduled_at").gte("scheduled_at", now.toISOString()).lte("scheduled_at", future.toISOString()),
      ]);
      return { trainings: t.data ?? [], scrims: s.data ?? [] };
    },
    refetchInterval: 5 * 60 * 1000,
    enabled: !!user && !isAuthRoute,
  });

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setNotifEnabled(Notification.permission === "granted");
    }
  }, []);

  useEffect(() => {
    if (!notifEnabled || !upcoming) return;
    const fired = new Set(JSON.parse(sessionStorage.getItem("notif-fired") ?? "[]"));
    [...upcoming.trainings, ...upcoming.scrims].forEach((e: any) => {
      if (!fired.has(e.id)) {
        try {
          new Notification("Battle Arena — em breve", {
            body: `${e.title ?? `vs ${e.opponent}`} em menos de 1h`,
            tag: e.id,
          });
          fired.add(e.id);
        } catch {}
      }
    });
    sessionStorage.setItem("notif-fired", JSON.stringify([...fired]));
  }, [notifEnabled, upcoming]);

  // Auth screen: render full-bleed without app chrome
  if (isAuthRoute) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 flex items-center justify-center px-6 py-10">
          <Outlet />
        </main>
      </div>
    );
  }

  // Block protected content while we resolve session / before redirect kicks in
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-xs uppercase tracking-[0.3em]">
        Carregando...
      </div>
    );
  }

  async function toggleNotif() {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      setNotifEnabled((v) => !v);
      return;
    }
    const result = await Notification.requestPermission();
    setNotifEnabled(result === "granted");
  }

  const isPresentation = typeof document !== "undefined" && document.body.classList.contains("presentation-mode");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl print:hidden presentation-hide">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 gap-4">
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-primary shadow-glow">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-2xl tracking-wider">
                BATTLE <span className="text-gold">ARENA</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Pokémon Unite Team OPS
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-1 flex-wrap justify-end">
            {main.map((item) => {
              const active = isActive(location.pathname, item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium uppercase tracking-wider transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}

            <NavGroup label="Operação" items={operacao} pathname={location.pathname} />
            <NavGroup label="Estratégia" items={estrategia} pathname={location.pathname} />

            <button
              type="button"
              onClick={toggleNotif}
              title={notifEnabled ? "Desativar notificações" : "Ativar notificações"}
              className="ml-2 h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {notifEnabled ? <Bell className="h-3.5 w-3.5 text-gold" /> : <BellOff className="h-3.5 w-3.5" />}
            </button>

            <AuthButton />
          </nav>
        </div>
      </header>

      <main className={`flex-1 mx-auto w-full max-w-[1400px] px-6 py-10 ${isPresentation ? "presentation-main" : ""}`}>
        <Outlet />
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground print:hidden presentation-hide">
        Battle Arena · Team Operations Hub
      </footer>
    </div>
  );
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: { to: string; label: string; icon: any }[];
  pathname: string;
}) {
  const groupActive = items.some((i) => isActive(pathname, i.to));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium uppercase tracking-wider transition-all outline-none ${
          groupActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        {label}
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur border-border">
        {items.map((i) => {
          const Icon = i.icon;
          const active = isActive(pathname, i.to);
          return (
            <DropdownMenuItem key={i.to} asChild>
              <Link
                to={i.to}
                className={`flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider ${
                  active ? "text-gold" : ""
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {i.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AuthButton() {
  const { user, roles, signOut, loading } = useAuth();
  if (loading) return null;
  if (!user) {
    return (
      <Link
        to="/auth"
        className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-primary/40"
      >
        <LogIn className="h-3 w-3" /> Entrar
      </Link>
    );
  }
  const role = roles.includes("coach") ? "coach" : roles.includes("player") ? "player" : "viewer";
  const roleColor = role === "coach" ? "text-gold" : role === "player" ? "text-primary" : "text-muted-foreground";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 hover:border-primary/40">
        <UserCircle className="h-4 w-4" />
        <span className={`text-[10px] uppercase tracking-wider ${roleColor}`}>{role}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur border-border min-w-[180px]">
        <DropdownMenuLabel className="text-xs">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.includes("coach") && (
          <DropdownMenuItem asChild>
            <Link to="/admin" className="text-xs uppercase tracking-wider cursor-pointer flex items-center">
              <Shield className="h-3.5 w-3.5 mr-2 text-gold" /> Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => signOut()} className="text-xs uppercase tracking-wider cursor-pointer">
          <LogOut className="h-3.5 w-3.5 mr-2" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
