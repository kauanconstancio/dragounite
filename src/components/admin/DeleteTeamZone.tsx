import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { deleteTeam } from "@/server/admin.functions";

export function DeleteTeamZone() {
  const { team, refresh, setActiveTeam } = useCurrentTeam();
  const deleteTeamFn = useServerFn(deleteTeam);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step1Open, setStep1Open] = useState(false);
  const [step2Open, setStep2Open] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!team) return null;

  function openStep1() {
    setConfirmName("");
    setStep1Open(true);
  }

  function proceedToStep2() {
    setStep1Open(false);
    setTimeout(() => setStep2Open(true), 50);
  }

  async function handleDelete() {
    if (!team) return;
    setSubmitting(true);
    try {
      await deleteTeamFn({
        data: { team_id: team.id, confirm_name: confirmName },
      });
      toast.success(`Equipe "${team.name}" excluída.`);
      setStep2Open(false);
      setActiveTeam(null);
      await refresh();
      qc.invalidateQueries();
      navigate({ to: "/equipes" });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao excluir equipe.");
    } finally {
      setSubmitting(false);
    }
  }

  const nameMatches =
    confirmName.trim().toLowerCase() === team.name.trim().toLowerCase();

  return (
    <Card className="p-6 border-destructive/40 bg-destructive/5">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-destructive/10 p-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg tracking-wider text-destructive">
            ZONA DE PERIGO
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Excluir a equipe <strong>{team.name}</strong> remove
            permanentemente todos os dados: roster, treinos, scrims, builds,
            comunicados, convites e histórico de partidas. Esta ação{" "}
            <strong>não pode ser desfeita</strong>.
          </p>
          <Button
            variant="destructive"
            onClick={openStep1}
            className="mt-4 gap-2"
          >
            <Trash2 className="h-4 w-4" /> Excluir equipe
          </Button>
        </div>
      </div>

      {/* Step 1: are you sure? */}
      <AlertDialog open={step1Open} onOpenChange={setStep1Open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir a equipe{" "}
              <strong>{team.name}</strong> e todos os seus dados. Esta ação
              é permanente e irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={proceedToStep2}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Step 2: type team name to confirm */}
      <Dialog open={step2Open} onOpenChange={setStep2Open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Confirmação final
            </DialogTitle>
            <DialogDescription>
              Para confirmar, digite o nome exato da equipe abaixo:{" "}
              <strong className="text-foreground">{team.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-team-name">Nome da equipe</Label>
            <Input
              id="confirm-team-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={team.name}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStep2Open(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!nameMatches || submitting}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Excluir permanentemente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
