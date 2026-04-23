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
  Menu,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import dragouniteLogo from "@/assets/dragounite-logo.png";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import { ThemeApplier } from "@/components/ThemeApplier";

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
  const { data: team } = useTeamSettings();
  const [notifEnabled, setNotifEnabled] = useState(false);

  const teamName = team?.team_name ?? "DragoUnite Y";
  const teamLogo = team?.logo_url ?? dragouniteLogo;
  const [teamHead, ...teamRest] = teamName.split(" ");
  const teamTail = teamRest.join(" ");

  const isAuthRoute = location.pathname === "/auth";
  const isProfileRoute = location.pathname === "/perfil";

  useEffect(() => {
    if (!loading && !user && !isAuthRoute) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, user, isAuthRoute, navigate]);

  // First-login check: force profile completion (IGN, lane, main_pokemon required)
  const { data: profileCheck } = useQuery({
    queryKey: ["profile-complete-check", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: prof } = await supabase
        .from("profiles")
        .select("member_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!prof?.member_id) return { complete: true, hasMember: false };
      const { data: m } = await supabase
        .from("members")
        .select("ign, lane, main_pokemon")
        .eq("id", prof.member_id)
        .maybeSingle();
      const complete = !!(m?.ign && m?.lane && m?.main_pokemon);
      return { complete, hasMember: true };
    },
    enabled: !!user && !isAuthRoute,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (
      !loading &&
      user &&
      !isAuthRoute &&
      !isProfileRoute &&
      profileCheck &&
      profileCheck.hasMember &&
      !profileCheck.complete
    ) {
      navigate({ to: "/perfil", replace: true });
    }
  }, [loading, user, isAuthRoute, isProfileRoute, profileCheck, navigate]);

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
        <ThemeApplier />
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
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0">
            <img
              src={teamLogo}
              alt={teamName}
              className="h-10 w-10 sm:h-12 sm:w-12 object-contain shrink-0 drop-shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
            />

            <div className="leading-tight min-w-0">
              <div className="font-display text-lg sm:text-2xl tracking-wider truncate uppercase">
                {teamHead}
                {teamTail && <> <span className="text-primary">{teamTail}</span></>}
              </div>
              <div className="hidden sm:block text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Pokémon Unite Team OPS
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 flex-wrap justify-end">
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

          {/* Mobile controls */}
          <div className="flex lg:hidden items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleNotif}
              title={notifEnabled ? "Desativar notificações" : "Ativar notificações"}
              className="h-9 w-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {notifEnabled ? <Bell className="h-4 w-4 text-gold" /> : <BellOff className="h-4 w-4" />}
            </button>
            <AuthButton />
            <MobileNav pathname={location.pathname} />
          </div>
        </div>
      </header>

      <main className={`flex-1 mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-6 sm:py-10 ${isPresentation ? "presentation-main" : ""}`}>
        <Outlet />
      </main>

      <footer className="border-t border-border/60 py-6 px-4 text-center text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-muted-foreground print:hidden presentation-hide">
        Battle Arena · Team Operations Hub
      </footer>
    </div>
  );
}

function MobileTeamTitle() {
  const { data: team } = useTeamSettings();
  const name = team?.team_name ?? "DragoUnite Y";
  const [head, ...rest] = name.split(" ");
  const tail = rest.join(" ");
  return (
    <>
      {head}
      {tail && <> <span className="text-primary">{tail}</span></>}
    </>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const sections: { label: string; items: { to: string; label: string; icon: any }[] }[] = [
    { label: "Principal", items: main },
    { label: "Operação", items: operacao },
    { label: "Estratégia", items: estrategia },
  ];
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu"
          className="h-9 w-9 rounded-md border border-border flex items-center justify-center text-foreground"
        >
          <Menu className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] max-w-sm overflow-y-auto p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <SheetTitle className="font-display text-xl tracking-wider uppercase">
            <MobileTeamTitle />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-6 px-5 py-5">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2 px-1">
                {section.label}
              </div>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.to);
                  const Icon = item.icon;
                  return (
                    <SheetClose asChild key={item.to}>
                      <Link
                        to={item.to}
                        className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium uppercase tracking-wider transition-all ${
                          active
                            ? "bg-primary text-primary-foreground shadow-glow"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
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
        <DropdownMenuItem asChild>
          <Link to="/perfil" className="text-xs uppercase tracking-wider cursor-pointer flex items-center">
            <UserCircle className="h-3.5 w-3.5 mr-2" /> Meu perfil
          </Link>
        </DropdownMenuItem>
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
