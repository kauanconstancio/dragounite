import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Plus, Users } from "lucide-react";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function TeamSwitcher() {
  const { teams, team, setActiveTeam, loading } = useCurrentTeam();
  const { isSuperAdmin } = useAuth();

  if (loading || !team) return null;
  if (teams.length <= 1 && !isSuperAdmin) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-primary/40 max-w-[160px] truncate">
        <Users className="h-3 w-3 shrink-0" />
        <span className="truncate">{team.name}</span>
        <ChevronDown className="h-3 w-3 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur border-border min-w-[220px]">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Trocar equipe
        </DropdownMenuLabel>
        {teams.map((entry) => {
          const active = entry.team.id === team.id;
          return (
            <DropdownMenuItem
              key={entry.team.id}
              onClick={() => setActiveTeam(entry.team.id)}
              className="cursor-pointer text-xs"
            >
              <span className="flex-1 truncate">{entry.team.name}</span>
              <span className="ml-2 text-[9px] uppercase tracking-wider text-muted-foreground">
                {entry.team_role}
              </span>
              {active && <Check className="h-3 w-3 ml-1.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/equipes" className="text-xs uppercase tracking-wider cursor-pointer flex items-center">
            <Users className="h-3.5 w-3.5 mr-2" /> Ver todas
          </Link>
        </DropdownMenuItem>
        {isSuperAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin-org" className="text-xs uppercase tracking-wider cursor-pointer flex items-center">
              <Plus className="h-3.5 w-3.5 mr-2 text-gold" /> Gerenciar organização
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
