import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  type RecurrenceFreq,
  type RecurrenceRule,
  WEEKDAY_LABELS,
  expandRecurrence,
} from "@/lib/recurrence";
import { cn } from "@/lib/utils";
import { Repeat } from "lucide-react";

export type RecurrenceState = {
  freq: RecurrenceFreq;
  byWeekday: number[];
  count: number;
  until: string; // yyyy-mm-dd or ""
};

export const emptyRecurrence = (): RecurrenceState => ({
  freq: "none",
  byWeekday: [],
  count: 8,
  until: "",
});

export function toRecurrenceRule(state: RecurrenceState): RecurrenceRule | null {
  if (state.freq === "none") return null;
  return {
    freq: state.freq,
    byWeekday: state.byWeekday.length > 0 ? state.byWeekday : undefined,
    count: state.until ? undefined : Math.max(1, Math.min(60, state.count || 1)),
    until: state.until || undefined,
  };
}

export function RecurrenceField({
  baseDateISO,
  state,
  onChange,
  disabled,
}: {
  baseDateISO: string;
  state: RecurrenceState;
  onChange: (s: RecurrenceState) => void;
  disabled?: boolean;
}) {
  const isWeekly = state.freq === "weekly" || state.freq === "biweekly";
  const showOptions = state.freq !== "none";

  const preview = showOptions && baseDateISO
    ? expandRecurrence(baseDateISO, toRecurrenceRule(state)).length
    : 0;

  const toggleDay = (d: number) => {
    onChange({
      ...state,
      byWeekday: state.byWeekday.includes(d)
        ? state.byWeekday.filter((x) => x !== d)
        : [...state.byWeekday, d].sort((a, b) => a - b),
    });
  };

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <Repeat className="h-4 w-4 text-primary" />
        <Label className="text-xs uppercase tracking-widest">Recorrência</Label>
      </div>

      <Select
        value={state.freq}
        onValueChange={(v) => onChange({ ...state, freq: v as RecurrenceFreq })}
        disabled={disabled}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Não se repete</SelectItem>
          <SelectItem value="daily">Diariamente</SelectItem>
          <SelectItem value="weekly">Semanalmente</SelectItem>
          <SelectItem value="biweekly">A cada 2 semanas</SelectItem>
          <SelectItem value="monthly">Mensalmente</SelectItem>
        </SelectContent>
      </Select>

      {showOptions && (
        <>
          {isWeekly && (
            <div>
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Dias da semana (opcional)
              </Label>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {WEEKDAY_LABELS.map((lbl, i) => (
                  <Button
                    key={i}
                    type="button"
                    size="sm"
                    variant={state.byWeekday.includes(i) ? "default" : "outline"}
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "h-7 px-2 text-[10px] uppercase tracking-wider",
                      state.byWeekday.includes(i) && "bg-gradient-primary",
                    )}
                  >
                    {lbl}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rec-count" className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Quantidade
              </Label>
              <Input
                id="rec-count"
                type="number"
                min={1}
                max={60}
                value={state.count}
                disabled={!!state.until}
                onChange={(e) => onChange({ ...state, count: Number(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label htmlFor="rec-until" className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Até (opcional)
              </Label>
              <Input
                id="rec-until"
                type="date"
                value={state.until}
                onChange={(e) => onChange({ ...state, until: e.target.value })}
              />
            </div>
          </div>

          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {preview > 0
              ? `${preview} ocorrência${preview > 1 ? "s" : ""} serão criadas`
              : "Sem ocorrências válidas"}
          </p>
        </>
      )}
    </div>
  );
}
