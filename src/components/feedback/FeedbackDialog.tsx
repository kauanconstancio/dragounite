import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send } from "lucide-react";

const schema = z.object({
  type: z.enum(["suggestion", "bug", "improvement"]),
  title: z.string().trim().min(3, "Título muito curto").max(120, "Máx 120 caracteres"),
  description: z.string().trim().min(10, "Descreva com mais detalhes").max(2000, "Máx 2000 caracteres"),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType?: "suggestion" | "bug" | "improvement";
}

export function FeedbackDialog({ open, onOpenChange, defaultType = "suggestion" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [type, setType] = useState<"suggestion" | "bug" | "improvement">(defaultType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Faça login para enviar feedback.");
      const parsed = schema.parse({ type, title, description });
      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        type: parsed.type,
        title: parsed.title,
        description: parsed.description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback enviado! Obrigado pela contribuição.");
      qc.invalidateQueries({ queryKey: ["feedback"] });
      setTitle("");
      setDescription("");
      setType(defaultType);
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Erro ao enviar feedback.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wider uppercase">
            Enviar <span className="text-gold">Feedback</span>
          </DialogTitle>
          <DialogDescription>
            Compartilhe sugestões, bugs ou ideias de melhoria para evoluirmos o sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="fb-type" className="text-xs uppercase tracking-wider">Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger id="fb-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="suggestion">💡 Sugestão</SelectItem>
                <SelectItem value="bug">🐛 Bug</SelectItem>
                <SelectItem value="improvement">⚡ Melhoria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fb-title" className="text-xs uppercase tracking-wider">Título</Label>
            <Input
              id="fb-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resumo curto"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fb-desc" className="text-xs uppercase tracking-wider">Descrição</Label>
            <Textarea
              id="fb-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhadamente. Para bugs, inclua passos para reproduzir."
              rows={6}
              maxLength={2000}
            />
            <div className="text-[10px] text-muted-foreground text-right">
              {description.length}/2000
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            <Send className="h-4 w-4 mr-2" />
            {mutation.isPending ? "Enviando..." : "Enviar feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
