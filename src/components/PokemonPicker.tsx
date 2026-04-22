import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { POKEMON_LIST } from "@/lib/pokemon";
import { PokemonImage } from "@/components/PokemonImage";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

type Props = {
  value: string | null | undefined;
  onChange: (name: string | null) => void;
  placeholder?: string;
  triggerClassName?: string;
};

export function PokemonPicker({ value, onChange, placeholder = "Selecione um Pokémon", triggerClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = POKEMON_LIST.filter((p) =>
    p.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 w-full h-10 px-3 rounded-md border border-input bg-background text-sm hover:border-primary/50 transition-colors text-left",
          triggerClassName,
        )}
      >
        {value ? (
          <>
            <div className="h-7 w-7 rounded bg-gradient-primary/20 border border-border flex items-center justify-center overflow-hidden shrink-0">
              <PokemonImage name={value} />
            </div>
            <span className="flex-1 truncate">{value}</span>
            <X
              className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive shrink-0"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
            />
          </>
        ) : (
          <span className="text-muted-foreground flex-1">{placeholder}</span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wider">
              Escolha um <span className="text-gold">Pokémon</span>
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar Pokémon..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="overflow-y-auto -mx-2 px-2 flex-1">
            {filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 text-sm">
                Nenhum Pokémon encontrado.
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2 py-2">
                {filtered.map((p) => {
                  const selected = p === value;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { onChange(p); setOpen(false); setQuery(""); }}
                      className={cn(
                        "group flex flex-col items-center gap-1 p-2 rounded-md border bg-card hover:bg-accent hover:border-primary/60 transition-all",
                        selected ? "border-primary shadow-glow bg-primary/10" : "border-border",
                      )}
                    >
                      <div className="aspect-square w-full rounded bg-gradient-primary/20 border border-border/50 flex items-center justify-center p-1 overflow-hidden group-hover:scale-105 transition-transform">
                        <PokemonImage name={p} />
                      </div>
                      <span className="font-display text-[10px] tracking-wider text-center leading-tight truncate w-full uppercase">
                        {p}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">
              {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
            </span>
            <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
