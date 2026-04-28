import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  UniteDbBattleItem,
  UniteDbHeldItem,
  UniteDbSkill,
} from "@/lib/unite-db-types";

const TIER_CLR: Record<string, string> = {
  S: "text-gold border-gold/60",
  A: "text-primary border-primary/60",
  B: "text-sky-400 border-sky-400/60",
  C: "text-emerald-400 border-emerald-400/60",
  D: "text-muted-foreground border-border",
};

function TierChip({ tier }: { tier?: string }) {
  if (!tier) return null;
  const clr = TIER_CLR[tier] ?? "text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center justify-center text-[9px] uppercase tracking-widest border rounded px-1.5 py-0.5 ${clr}`}
    >
      Tier {tier}
    </span>
  );
}

function Wrapper({
  trigger,
  children,
}: {
  trigger: ReactNode;
  children: ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{trigger}</span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-xs p-3 bg-popover border-border shadow-xl"
        >
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function HeldItemTooltip({
  trigger,
  name,
  data,
}: {
  trigger: ReactNode;
  name: string;
  data: UniteDbHeldItem | null;
}) {
  if (!data) {
    return (
      <Wrapper trigger={trigger}>
        <div className="text-xs text-muted-foreground">{name}</div>
      </Wrapper>
    );
  }
  const bonuses = [data.bonus1, data.bonus2, data.bonus3].filter(Boolean) as string[];
  return (
    <Wrapper trigger={trigger}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="font-display text-sm tracking-wider">{data.display_name}</div>
          <TierChip tier={data.tier} />
        </div>
        {bonuses.length > 0 && (
          <ul className="text-[11px] text-foreground/90 space-y-0.5">
            {bonuses.map((b) => (
              <li key={b} className="flex gap-1">
                <span className="text-gold">+</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        {data.description1 && (
          <p className="text-[11px] leading-snug text-muted-foreground">
            {data.description1}
          </p>
        )}
        {data.description2 && (
          <p className="text-[11px] leading-snug text-muted-foreground">
            {data.description2}
          </p>
        )}
        {data.note && (
          <p className="text-[10px] italic text-muted-foreground/80 border-l-2 border-border pl-2">
            {data.note}
          </p>
        )}
      </div>
    </Wrapper>
  );
}

export function BattleItemTooltip({
  trigger,
  name,
  data,
}: {
  trigger: ReactNode;
  name: string;
  data: UniteDbBattleItem | null;
}) {
  if (!data) {
    return (
      <Wrapper trigger={trigger}>
        <div className="text-xs text-muted-foreground">{name}</div>
      </Wrapper>
    );
  }
  return (
    <Wrapper trigger={trigger}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="font-display text-sm tracking-wider">{data.display_name}</div>
          <TierChip tier={data.tier} />
        </div>
        <div className="flex gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          {typeof data.cooldown === "number" && <span>CD {data.cooldown}s</span>}
          {typeof data.level === "number" && <span>Lv {data.level}</span>}
        </div>
        {data.description && (
          <p className="text-[11px] leading-snug text-foreground/90">
            {data.description}
          </p>
        )}
      </div>
    </Wrapper>
  );
}

export function SkillTooltip({
  trigger,
  skill,
}: {
  trigger: ReactNode;
  skill: UniteDbSkill;
}) {
  return (
    <Wrapper trigger={trigger}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="font-display text-sm tracking-wider">{skill.name}</div>
          {skill.ability && (
            <span className="text-[9px] uppercase tracking-widest text-gold border border-gold/40 rounded px-1.5 py-0.5">
              {skill.ability}
            </span>
          )}
        </div>
        {skill.description && (
          <p className="text-[11px] leading-snug text-foreground/90">
            {skill.description}
          </p>
        )}
      </div>
    </Wrapper>
  );
}
