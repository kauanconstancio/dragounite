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
  ScrollText,
  ChevronDown,
  Bell,
  BellOff,
  LogIn,
  LogOut,
  UserCircle,
  Menu,
  Trophy,
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
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { ThemeApplier } from "@/components/ThemeApplier";
import { TeamSwitcher } from "@/components/TeamSwitcher";

const main = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/roster", label: "Roster", icon: Users },
  { to: "/testes", label: "Testes", icon: UserCircle },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
];

const operacao = [
  { to: "/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/amistosos", label: "Amistosos", icon: Swords },
  { to: "/oponentes", label: "Oponentes", icon: Target },
  { to: "/mural", label: "Mural", icon: Megaphone },
  { to: "/titulos", label: "Títulos", icon: Trophy },
];

const estrategia = [
  { to: "/composicoes", label: "Composições", icon: Sparkles },
  { to: "/builds", label: "Builds", icon: BookOpen },
  { to: "/draft", label: "Draft", icon: Crosshair },
  { to: "/planner", label: "Planner", icon: Map },
  { to: "/jogadas", label: "Jogadas", icon: Library },
  { to: "/tier-list", label: "Tier List", icon: ListOrdered },
  { to: "/patches", label: "Patches", icon: ScrollText },
];

function isActive(pathname: string, to: string) {
  if (to === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(to);
}

// Rotas públicas: não exigem autenticação nem seleção de equipe.
// Inclui a landing (/, /landing) e fluxos de auth/recuperação.
const PUBLIC_ROUTE_PREFIXES = ["/landing", "/planos", "/auth", "/cadastro", "/aceitar-convite", "/reset-password", "/forgot-password"];
const PUBLIC_EXACT_ROUTES = ["/"];

function isPublicRoute(pathname: string) {
  if (PUBLIC_EXACT_ROUTES.includes(pathname)) return true;
  return PUBLIC_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Rotas full-bleed (sem header/footer/chrome do app), mesmo se o usuário estiver logado.
function isFullBleedRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/landing") ||
    pathname.startsWith("/planos") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/aceitar-convite") ||
    pathname.startsWith("/onboarding") ||
    pathname === "/staff" ||
    pathname.startsWith("/staff/")
  );
}

const STAFF_EMAIL = "staff@gymli.com";

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: settings } = useTeamSettings();
  const { team: activeTeam, teams: userTeams, loading: teamsLoading } = useCurrentTeam();
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Active team branding takes precedence; falls back to global settings.
  const teamName = activeTeam?.name ?? settings?.team_name ?? "DragoUnite Y";
  const teamLogo = activeTeam?.logo_url ?? settings?.logo_url ?? dragouniteLogo;
  const [teamHead, ...teamRest] = teamName.split(" ");
  const teamTail = teamRest.join(" ");

  const isAuthRoute = location.pathname === "/auth";
  const isPublic = isPublicRoute(location.pathname);
  const isFullBleed = isFullBleedRoute(location.pathname);
  const isProfileRoute = location.pathname === "/perfil";
  const isOnboardingRoute = location.pathname === "/onboarding";
  const isTeamPickerRoute = location.pathname === "/equipes";

  const isStaffEmail = user?.email?.toLowerCase() === STAFF_EMAIL;
  const isStaffRoute = location.pathname === "/staff" || location.pathname.startsWith("/staff/");

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, user, isPublic, navigate]);

  // Force staff to the staff console whenever they land on team-scoped pages.
  useEffect(() => {
    if (!loading && user && isStaffEmail && !isStaffRoute && !isPublic && !isProfileRoute) {
      navigate({ to: "/staff", replace: true });
    }
  }, [loading, user, isStaffEmail, isStaffRoute, isPublic, isProfileRoute, navigate]);

  // Redirect to team picker when authenticated user has no active team yet
  // and is not already on a public/team-agnostic page.
  useEffect(() => {
    if (
      !loading &&
      user &&
      !isStaffEmail &&
      !teamsLoading &&
      !activeTeam &&
      !isPublic &&
      !isProfileRoute &&
      !isTeamPickerRoute &&
      !isOnboardingRoute
    ) {
      navigate({ to: "/equipes", replace: true });
    }
  }, [loading, user, isStaffEmail, teamsLoading, activeTeam, isPublic, isProfileRoute, isTeamPickerRoute, isOnboardingRoute, navigate]);

  // First-login check: force profile completion (IGN, lane, main_pokemon required)
  // Scoped to ACTIVE TEAM — each team has its own member entry.
  const { data: profileCheck } = useQuery({
    queryKey: ["profile-complete-check", user?.id, activeTeam?.id],
    queryFn: async () => {
      if (!user || !activeTeam?.id) return null;
      const { data: m } = await supabase
        .from("members")
        .select("ign, lane, main_pokemon")
        .eq("team_id", activeTeam.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!m) return { complete: true, hasMember: false };
      const complete = !!(m.ign && m.lane && m.main_pokemon);
      return { complete, hasMember: true };
    },
    enabled: !!user && !!activeTeam?.id && !isPublic,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (
      !loading &&
      user &&
      !isPublic &&
      !isProfileRoute &&
      profileCheck &&
      profileCheck.hasMember &&
      !profileCheck.complete
    ) {
      navigate({ to: "/perfil", replace: true });
    }
  }, [loading, user, isPublic, isProfileRoute, profileCheck, navigate]);

  // Polling for upcoming events (only when authenticated, scoped to active team)
  const { data: upcoming } = useQuery({
    queryKey: ["upcoming-notif", activeTeam?.id],
    queryFn: async () => {
      if (!activeTeam?.id) return { trainings: [], scrims: [] };
      const now = new Date();
      const future = new Date(now.getTime() + 60 * 60 * 1000); // 1h
      const [t, s] = await Promise.all([
        supabase.from("trainings").select("id, title, scheduled_at").eq("team_id", activeTeam.id).gte("scheduled_at", now.toISOString()).lte("scheduled_at", future.toISOString()),
        supabase.from("scrims").select("id, opponent, scheduled_at").eq("team_id", activeTeam.id).gte("scheduled_at", now.toISOString()).lte("scheduled_at", future.toISOString()),
      ]);
      return { trainings: t.data ?? [], scrims: s.data ?? [] };
    },
    refetchInterval: 5 * 60 * 1000,
    enabled: !!user && !isAuthRoute && !!activeTeam?.id,
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

  // Public/Full-bleed screens (landing, auth, recuperação): renderiza sem chrome
  // do app e SEM exigir autenticação.
  if (isFullBleed) {
    return (
      <div className="min-h-screen flex flex-col">
        <Outlet />
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
      <ThemeApplier />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl print:hidden presentation-hide">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-3 sm:px-6 py-2.5 sm:py-4 gap-2 sm:gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 sm:gap-3 group shrink min-w-0 overflow-hidden">
            <img
              src={teamLogo}
              alt={teamName}
              className="h-9 w-9 sm:h-12 sm:w-12 object-contain shrink-0 drop-shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
            />

            <div className="leading-tight min-w-0">
              <div className="font-display text-base sm:text-2xl tracking-wider truncate uppercase">
                {teamHead}
                {teamTail && <> <span className="text-primary">{teamTail}</span></>}
              </div>
              <div className="hidden sm:block text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Pokémon Unite Team OPS
              </div>
            </div>
          </Link>

          {/* Unified controls (hamburger menu for all viewports) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggleNotif}
              title={notifEnabled ? "Desativar notificações" : "Ativar notificações"}
              className="h-9 w-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {notifEnabled ? <Bell className="h-4 w-4 text-gold" /> : <BellOff className="h-4 w-4" />}
            </button>
            <TeamSwitcher />
            <MobileNav pathname={location.pathname} />
          </div>
        </div>
      </header>

      <main className={`flex-1 mx-auto w-full max-w-[1400px] min-w-0 px-3 sm:px-6 py-5 sm:py-10 overflow-x-hidden ${isPresentation ? "presentation-main" : ""}`}>
        <Outlet />
      </main>

      <footer className="border-t border-border/60 py-6 px-4 text-center text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-muted-foreground print:hidden presentation-hide">
        Battle Arena · Team Operations Hub
      </footer>
    </div>
  );
}

function MobileTeamTitle() {
  const { team } = useCurrentTeam();
  const { data: settings } = useTeamSettings();
  const name = team?.name ?? settings?.team_name ?? "DragoUnite Y";
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
  const { user, roles, signOut, isSuperAdmin } = useAuth();
  const sections: { label: string; items: { to: string; label: string; icon: any }[] }[] = [
    { label: "Principal", items: main },
    { label: "Operação", items: operacao },
    { label: "Estratégia", items: estrategia },
  ];
  const accountItems: { to: string; label: string; icon: any }[] = [
    { to: "/perfil", label: "Meu perfil", icon: UserCircle },
    { to: "/equipes", label: "Minhas equipes", icon: Shield },
  ];
  if (roles.includes("coach") || isSuperAdmin) {
    accountItems.push({ to: "/admin", label: "Admin equipe", icon: Shield });
  }
  if (isSuperAdmin) {
    accountItems.push({ to: "/staff", label: "Staff Console", icon: Shield });
  }
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
      <SheetContent
        side="right"
        className="w-[88vw] max-w-[340px] sm:max-w-sm h-screen max-h-screen inset-y-0 top-0 bottom-0 overflow-y-auto p-0 flex flex-col"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60 shrink-0">
          <SheetTitle className="font-display text-xl tracking-wider uppercase text-left">
            <MobileTeamTitle />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-5 px-4 py-5 overflow-y-auto pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          {user && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2 px-1">
                Conta
              </div>
              <div className="px-1 pb-2 text-[11px] text-muted-foreground truncate">{user.email}</div>
              <div className="flex flex-col gap-1">
                {accountItems.map((item) => {
                  const active = isActive(pathname, item.to);
                  const Icon = item.icon;
                  return (
                    <SheetClose asChild key={item.to}>
                      <Link
                        to={item.to}
                        className={`flex items-center gap-3 rounded-md px-3 py-3 text-[13px] font-medium uppercase tracking-wider transition-all ${
                          active
                            ? "bg-primary text-primary-foreground shadow-glow"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>
            </div>
          )}

          {!user && (
            <SheetClose asChild>
              <Link
                to="/auth"
                className="flex items-center gap-3 rounded-md border border-border px-3 py-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                <LogIn className="h-4 w-4 shrink-0" /> Entrar
              </Link>
            </SheetClose>
          )}

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
                        className={`flex items-center gap-3 rounded-md px-3 py-3 text-[13px] font-medium uppercase tracking-wider transition-all ${
                          active
                            ? "bg-primary text-primary-foreground shadow-glow"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>
            </div>
          ))}

          {user && (
            <div className="pt-2 border-t border-border/60">
              <SheetClose asChild>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 rounded-md px-3 py-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground hover:bg-accent hover:text-foreground transition-all text-left"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="truncate">Sair</span>
                </button>
              </SheetClose>
            </div>
          )}
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
  const { user, roles, signOut, loading, isSuperAdmin } = useAuth();
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
        <DropdownMenuItem asChild>
          <Link to="/equipes" className="text-xs uppercase tracking-wider cursor-pointer flex items-center">
            <Shield className="h-3.5 w-3.5 mr-2" /> Minhas equipes
          </Link>
        </DropdownMenuItem>
        {(roles.includes("coach") || isSuperAdmin) && (
          <DropdownMenuItem asChild>
            <Link to="/admin" className="text-xs uppercase tracking-wider cursor-pointer flex items-center">
              <Shield className="h-3.5 w-3.5 mr-2 text-gold" /> Admin equipe
            </Link>
          </DropdownMenuItem>
        )}
        {isSuperAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/staff" className="text-xs uppercase tracking-wider cursor-pointer flex items-center">
              <Shield className="h-3.5 w-3.5 mr-2 text-gold" /> Staff Console
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
