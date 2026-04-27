import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Lightbulb, Bug, Zap, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "./FeedbackDialog";

export function FeedbackHero() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"suggestion" | "bug" | "improvement">("suggestion");

  function openWith(t: "suggestion" | "bug" | "improvement") {
    setType(t);
    setOpen(true);
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-gold/10 p-6 sm:p-8 shadow-card"
      >
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-gold/20 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-background/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-gold mb-3">
              <Sparkles className="h-3 w-3" />
              Sua voz molda a arena
            </div>
            <h2 className="font-display text-2xl sm:text-3xl tracking-wider">
              Tem uma <span className="text-gold">sugestão</span>, encontrou um{" "}
              <span className="text-primary">bug</span> ou ideia de melhoria?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Envie seu feedback diretamente para a equipe. Cada contribuição ajuda a evoluir o sistema.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => openWith("suggestion")} className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Sugestão
              </Button>
              <Button onClick={() => openWith("bug")} variant="outline" className="gap-2 border-destructive/40 hover:bg-destructive/10">
                <Bug className="h-4 w-4 text-destructive" />
                Reportar bug
              </Button>
              <Button onClick={() => openWith("improvement")} variant="outline" className="gap-2">
                <Zap className="h-4 w-4 text-gold" />
                Melhoria
              </Button>
              <Link
                to="/feedback"
                className="inline-flex items-center gap-1 px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Ver meus envios <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      <FeedbackDialog open={open} onOpenChange={setOpen} defaultType={type} />
    </>
  );
}
