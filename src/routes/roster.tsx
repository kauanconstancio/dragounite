import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Headphones, ClipboardList, Swords } from "lucide-react";
import { ROLE_LABEL, ROLE_COLORS, LANE_LABEL } from "@/lib/pokemon";
import { PokemonImage } from "@/components/PokemonImage";
import { motion } from "framer-motion";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";

export const Route = createFileRoute("/roster")({
  head: () => ({
    meta: [
      { title: "Roster — Battle Arena" },
      { name: "description", content: "Jogadores, reservas, coach e gerentes do time." },
    ],
  }),
  component: RosterPage,
});

type Member = {
  id: string;
  name: string;
  ign: string | null;
  game_id: string | null;
  role: "player" | "substitute" | "coach" | "manager";
  lane: "top" | "jungle" | "mid" | "bot" | "support" | "flex" | null;
  main_pokemon: string | null;
  discord: string | null;
  notes: string | null;
};

const ROLE_ICONS = {
  player: Swords,
  substitute: ClipboardList,
  coach: Headphones,
  manager: Crown,
};

const SECTIONS: { key: Member["role"]; title: string; subtitle: string }[] = [
  { key: "player", title: "Titulares", subtitle: "Five for the Aeos Cup" },
  { key: "substitute", title: "Reservas", subtitle: "Backup squad" },
  { key: "coach", title: "Coaching Staff", subtitle: "Strategy & analysis" },
  { key: "manager", title: "Gestão", subtitle: "Operações do time" },
];

function RosterPage() {
  const { team } = useCurrentTeam();
  const teamId = team?.id;
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members", teamId],
    queryFn: async () => {
      if (!teamId) return [] as Member[];
      const { data, error } = await supabase.from("members").select("*").eq("team_id", teamId).order("created_at");
      if (error) throw error;
      return data as Member[];
    },
    enabled: !!teamId,
  });

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-5xl tracking-wider">
            ROSTER <span className="text-gold">DO TIME</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            {members.length} {members.length === 1 ? "membro" : "membros"} ativos
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground max-w-sm text-right uppercase tracking-widest">
          Contas são criadas pela gestão no painel admin. Cada jogador edita seu próprio card em <span className="text-gold">Perfil</span>.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-20">Carregando roster...</div>
      ) : (
        SECTIONS.map((section) => {
          const sectionMembers = members.filter((m) => m.role === section.key);
          const Icon = ROLE_ICONS[section.key];
          return (
            <section key={section.key}>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-card border border-border">
                  <Icon className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <h2 className="font-display text-2xl tracking-wider">{section.title}</h2>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">{section.subtitle}</p>
                </div>
                <div className="flex-1 h-px bg-border ml-3" />
                <Badge variant="outline" className="border-border">{sectionMembers.length}</Badge>
              </div>

              {sectionMembers.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg py-8 text-center text-sm text-muted-foreground">
                  Nenhum {ROLE_LABEL[section.key].toLowerCase()} cadastrado.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sectionMembers.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Card className="p-5 bg-card border-border hover:border-primary/50 transition-all shadow-card group">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground font-display text-xl shadow-glow">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-display text-lg leading-tight">{m.name}</div>
                              {m.ign && <div className="text-xs text-gold uppercase tracking-wider">@{m.ign}</div>}
                            </div>
                          </div>
                          {(m.role === "player" || m.role === "substitute") && (
                            <Link
                              to="/jogadores/$memberId"
                              params={{ memberId: m.id }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-gold"
                              title="Ver perfil & KDA"
                            >
                              <Swords className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge className={`uppercase tracking-wider text-[10px] ${ROLE_COLORS[m.role]}`} variant="outline">
                            {ROLE_LABEL[m.role]}
                          </Badge>
                          {m.lane && (
                            <Badge variant="outline" className="border-border text-[10px] uppercase tracking-wider">
                              {LANE_LABEL[m.lane]}
                            </Badge>
                          )}
                        </div>

                        {m.main_pokemon && (
                          <div className="mt-3 flex items-center gap-3">
                            <div className="h-14 w-14 shrink-0">
                              <PokemonImage name={m.main_pokemon} withRoleBg />
                            </div>
                            <div>
                              <div className="text-muted-foreground text-[10px] uppercase tracking-widest">Main</div>
                              <div className="text-foreground font-medium text-sm">{m.main_pokemon}</div>
                            </div>
                          </div>
                        )}
                        {m.discord && (
                          <div className="mt-1 text-xs text-muted-foreground">Discord: {m.discord}</div>
                        )}
                        {m.game_id && (
                          <div className="mt-1 text-xs text-muted-foreground">ID no jogo: <span className="text-foreground font-mono">{m.game_id}</span></div>
                        )}
                        {m.notes && (
                          <p className="mt-3 text-xs text-muted-foreground italic line-clamp-2">{m.notes}</p>
                        )}
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
