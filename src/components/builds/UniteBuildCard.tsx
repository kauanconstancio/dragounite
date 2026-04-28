import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Sparkles } from "lucide-react";
import { heldItemImage, battleItemImage, skillImage, type UniteDbBuild } from "@/lib/unite-db-types";

function ItemImg({ name, kind }: { name: string; kind: "held" | "battle" }) {
  const [err, setErr] = useState(false);
  const src = kind === "held" ? heldItemImage(name) : battleItemImage(name);
  return (
    <div className="h-9 w-9 rounded-md bg-muted/40 border border-border flex items-center justify-center overflow-hidden shrink-0">
      {err ? (
        <span className="text-[8px] text-muted-foreground px-0.5 text-center leading-tight">{name.slice(0, 6)}</span>
      ) : (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-contain"
          loading="lazy"
          onError={() => setErr(true)}
        />
      )}
    </div>
  );
}

function MoveImg({ pokemonSlug, name }: { pokemonSlug: string; name: string }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
        {name}
      </Badge>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-md border border-primary/30 bg-primary/5">
      <img
        src={skillImage(pokemonSlug, name)}
        alt={name}
        className="h-6 w-6 object-contain"
        loading="lazy"
        onError={() => setErr(true)}
      />
      <span className="text-[10px] text-primary font-medium">{name}</span>
    </div>
  );
}

export function UniteBuildCard({
  build,
  pokemonSlug,
  onImport,
}: {
  build: UniteDbBuild;
  pokemonSlug?: string;
  onImport?: (b: UniteDbBuild) => void;
}) {
  return (
    <Card className="p-4 border-border bg-card/60 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="font-display text-base tracking-wider truncate">{build.name}</div>
          {build.lane && (
            <Badge variant="outline" className="mt-1 text-[9px] uppercase tracking-widest border-gold/40 text-gold">
              {build.lane}
            </Badge>
          )}
        </div>
        {onImport && (
          <Button
            size="sm"
            variant="ghost"
            className="text-[10px] uppercase tracking-wider h-7 shrink-0"
            onClick={() => onImport(build)}
            title="Importar para suas builds"
          >
            <Download className="h-3 w-3 mr-1" /> Importar
          </Button>
        )}
      </div>

      {build.held_items?.length > 0 && (
        <div className="mb-3">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">Hold Items</div>
          <div className="flex gap-2 items-center flex-wrap">
            {build.held_items.map((it) => (
              <div key={it} className="flex items-center gap-1.5">
                <ItemImg name={it} kind="held" />
                <span className="text-[10px] text-foreground">{it}</span>
              </div>
            ))}
          </div>
          {build.held_items_optional && (
            <div className="text-[9px] text-muted-foreground mt-1.5">Opcional: {build.held_items_optional}</div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {build.battle_item && (
          <div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">Battle Item</div>
            <div className="flex items-center gap-1.5">
              <ItemImg name={build.battle_item} kind="battle" />
              <span className="text-[10px] text-foreground">{build.battle_item}</span>
            </div>
            {build.battle_item_optional && (
              <div className="text-[9px] text-muted-foreground mt-1">Alt: {build.battle_item_optional}</div>
            )}
          </div>
        )}

        {(build.basic?.length || build.upgrade?.length) && (
          <div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">Moveset</div>
            <div className="flex flex-wrap gap-1">
              {build.upgrade?.map((m) => (
                <Badge key={m} variant="outline" className="text-[10px] border-primary/40 text-primary">
                  {m}
                </Badge>
              ))}
            </div>
            {build.basic && build.basic.length > 0 && (
              <div className="text-[9px] text-muted-foreground mt-1">
                Base: {build.basic.join(" / ")}
              </div>
            )}
          </div>
        )}
      </div>

      {build.emblem_link && build.emblem_link.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" /> Emblemas
          </div>
          <div className="space-y-1">
            {build.emblem_link.map((link, i) => (
              <a
                key={link}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-gold hover:underline truncate"
              >
                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{build.emblem_name?.[i] ?? `Loadout ${i + 1}`}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
