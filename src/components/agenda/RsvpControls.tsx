import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TEAM_ID } from "@/lib/default-team";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Member = { id: string; name: string; ign: string | null; avatar_url: string | null };
type Att = { id: string; member_id: string; status: "confirmed" | "declined" | "tentative" };

type Props = {
  eventId: string;
  eventType: "training" | "scrim";
};

export function RsvpControls({ eventId, eventType }: Props) {
  const qc = useQueryClient();
  const [acting, setActing] = useState<string>("");

  const { data: members = [] } = useQuery({
    queryKey: ["members-rsvp"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, name, ign, avatar_url")
        .order("name");
      if (error) throw error;
      return data as Member[];
    },
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, member_id, status")
        .eq("event_id", eventId);
      if (error) throw error;
      return data as Att[];
    },
  });

  const upsert = useMutation({
    mutationFn: async ({ memberId, status }: { memberId: string; status: Att["status"] }) => {
      const existing = attendance.find((a) => a.member_id === memberId);
      if (existing) {
        const { error } = await supabase.from("attendance").update({ status }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance").insert({
          event_id: eventId,
          event_type: eventType,
          member_id: memberId,
          status,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance", eventId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const confirmed = attendance.filter((a) => a.status === "confirmed");
  const tentative = attendance.filter((a) => a.status === "tentative");
  const declined = attendance.filter((a) => a.status === "declined");
  const memberMap = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      <div className="flex items-center gap-2 flex-wrap text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className={cn("flex items-center gap-1", confirmed.length >= 5 && "text-gold")}>
          <Check className="h-3 w-3" /> {confirmed.length}/5 confirmados
        </span>
        {tentative.length > 0 && <span className="flex items-center gap-1"><HelpCircle className="h-3 w-3" /> {tentative.length} talvez</span>}
        {declined.length > 0 && <span className="flex items-center gap-1 text-destructive"><X className="h-3 w-3" /> {declined.length} fora</span>}
      </div>

      {confirmed.length > 0 && (
        <div className="flex -space-x-2">
          {confirmed.slice(0, 8).map((a) => {
            const m = memberMap.get(a.member_id);
            if (!m) return null;
            return (
              <Avatar key={a.id} className="h-7 w-7 border-2 border-card ring-1 ring-gold/40">
                {m.avatar_url && <AvatarImage src={m.avatar_url} alt={m.name} />}
                <AvatarFallback className="text-[10px]">{m.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Select value={acting} onValueChange={setActing}>
          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Quem está respondendo?" /></SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">{m.ign ?? m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2 text-gold border-gold/40 hover:bg-gold/10"
          disabled={!acting}
          onClick={() => acting && upsert.mutate({ memberId: acting, status: "confirmed" })}
          title="Confirmar"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2"
          disabled={!acting}
          onClick={() => acting && upsert.mutate({ memberId: acting, status: "tentative" })}
          title="Talvez"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2 text-destructive border-destructive/40 hover:bg-destructive/10"
          disabled={!acting}
          onClick={() => acting && upsert.mutate({ memberId: acting, status: "declined" })}
          title="Recusar"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
