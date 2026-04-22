import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Users, CalendarDays, Swords, Sparkles, Shield, Crosshair } from "lucide-react";

const navItems = [
  { to: "/", label: "Roster", icon: Users },
  { to: "/treinos", label: "Treinos", icon: CalendarDays },
  { to: "/amistosos", label: "Amistosos", icon: Swords },
  { to: "/composicoes", label: "Composições", icon: Sparkles },
  { to: "/draft", label: "Draft", icon: Crosshair },
];

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3 group">
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

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium uppercase tracking-wider transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-10">
        <Outlet />
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Battle Arena · Team Operations Hub
      </footer>
    </div>
  );
}
