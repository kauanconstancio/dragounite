import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Zap, Loader2, Plus, Trash2, Upload, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { completeOnboarding } from "@/server/onboarding.functions";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Configurar equipe — GymLy" }] }),
  component: OnboardingPage,
});

type Lane = "top" | "jungle" | "mid" | "bot" | "support" | "flex";
type RosterRow = { name: string; ign: string; lane: Lane | "" };

const LANES: Lane[] = ["top", "jungle", "mid", "bot", "support", "flex"];

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { teams, loading: teamsLoading, refresh, setActiveTeam } = useCurrentTeam();
  const onboardFn = useServerFn(completeOnboarding);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — identidade
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");

  // Step 2 — visual
  const [primaryColor, setPrimaryColor] = useState("#4f46e5");
  const [accentColor, setAccentColor] = useState("#818cf8");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Step 3 — roster
  const [roster, setRoster] = useState<RosterRow[]>([
    { name: "", ign: "", lane: "top" },
    { name: "", ign: "", lane: "jungle" },
    { name: "", ign: "", lane: "mid" },
    { name: "", ign: "", lane: "bot" },
    { name: "", ign: "", lane: "support" },
  ]);

  // Redirects: must be logged in; skip onboarding if already in a team
  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth", replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!authLoading && !teamsLoading && user && teams.length > 0) {
      setActiveTeam(teams[0].team.id);
      navigate({ to: "/dashboard", replace: true });
    }
  }, [authLoading, teamsLoading, user, teams, navigate, setActiveTeam]);

  async function handleLogoUpload(file: File) {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A logo deve ter até 2MB.");
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `onboarding/${user.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("team-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("team-assets").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
      toast.success("Logo enviada!");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  function updateRoster(idx: number, patch: Partial<RosterRow>) {
    setRoster((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addRosterRow() {
    if (roster.length >= 20) return;
    setRoster((rs) => [...rs, { name: "", ign: "", lane: "" }]);
  }
  function removeRosterRow(idx: number) {
    setRoster((rs) => rs.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!teamName.trim()) {
      toast.error("Informe o nome da equipe.");
      setStep(1);
      return;
    }
    if (!logoUrl) {
      toast.error("Envie a logo da equipe.");
      setStep(2);
      return;
    }
    setSubmitting(true);
    try {
      const cleaned = roster
        .map((r) => ({
          name: r.name.trim(),
          ign: r.ign.trim() || null,
          lane: (r.lane || null) as Lane | null,
        }))
        .filter((r) => r.name.length > 0);

      const res = await onboardFn({
        data: {
          team_name: teamName.trim(),
          description: description.trim() || null,
          primary_color: primaryColor,
          accent_color: accentColor,
          logo_url: logoUrl,
          roster: cleaned,
        },
      });
      toast.success("Equipe criada! Bem-vindo ao GymLy.");
      await refresh();
      setActiveTeam(res.team_id);
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar equipe.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || teamsLoading) {
    return (
      <div className="min-h-screen w-full bg-[#0a0a1a] flex items-center justify-center text-slate-400 text-xs uppercase tracking-[0.3em]">
        Carregando...
      </div>
    );
  }

  return (
    <div
      className="gymly-auth min-h-screen w-full bg-[#0a0a1a] text-white antialiased relative overflow-hidden"
      style={{ fontFamily: '"Manrope", system-ui, sans-serif' }}
    >
      <style>{`
        .gymly-auth h1, .gymly-auth h2, .gymly-auth h3 {
          font-family: "Sora", system-ui, sans-serif;
          letter-spacing: -0.02em;
        }
        .gymly-auth { color-scheme: dark; }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-indigo-600/20 blur-[120px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-6 h-16">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.5)]">
            <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            Gym<span className="text-indigo-400">Ly</span>
          </span>
        </div>
        <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          Configuração inicial
        </span>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pt-6 pb-20">
        {/* Stepper */}
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-1 flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  step >= n
                    ? "bg-indigo-600 text-white"
                    : "bg-[#141432] text-slate-500 border border-indigo-500/20"
                }`}
              >
                {n}
              </div>
              {n < 3 && (
                <div
                  className={`flex-1 h-px ${step > n ? "bg-indigo-500" : "bg-indigo-500/20"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-indigo-500/20 bg-[#141432]/80 backdrop-blur-xl p-8 shadow-[0_20px_60px_-20px_rgba(79,70,229,0.4)]">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Vamos conhecer sua equipe</h1>
                <p className="mt-2 text-sm text-slate-400">
                  Comece pelo essencial. Você pode ajustar tudo depois nas configurações.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ob-name" className="text-xs font-medium text-slate-300">
                  Nome da equipe / organização <span className="text-rose-400">*</span>
                </Label>
                <Input
                  id="ob-name"
                  required
                  maxLength={60}
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ex: Dragon Esports"
                  className="bg-[#0a0a1a]/60 border-indigo-500/20 text-white placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30 h-11"
                />
                <p className="text-[10px] text-slate-500">Obrigatório para criar a equipe.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ob-desc" className="text-xs font-medium text-slate-300">
                  Descrição curta (opcional)
                </Label>
                <Textarea
                  id="ob-desc"
                  maxLength={280}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Time competitivo de Pokémon Unite focado em scrims diárias..."
                  className="bg-[#0a0a1a]/60 border-indigo-500/20 text-white placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30 min-h-[88px]"
                />
                <div className="text-[10px] text-slate-500 text-right">
                  {description.length}/280
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => {
                    if (!teamName.trim()) {
                      toast.error("Informe o nome da equipe.");
                      return;
                    }
                    setStep(2);
                  }}
                  className="h-11 bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]"
                >
                  Continuar <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Identidade visual</h1>
                <p className="mt-2 text-sm text-slate-400">
                  Logo e cores que vão personalizar todo o painel da sua equipe.
                </p>
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-300">
                  Logo (PNG/SVG, até 2MB) <span className="text-rose-400">*</span>
                </Label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-xl border border-indigo-500/20 bg-[#0a0a1a]/60 flex items-center justify-center overflow-hidden shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-2" />
                    ) : (
                      <div
                        className="h-full w-full flex items-center justify-center text-2xl font-bold text-white"
                        style={{ background: primaryColor }}
                      >
                        {teamName.slice(0, 1).toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleLogoUpload(f);
                      }}
                    />
                    <div className="cursor-pointer rounded-lg border border-dashed border-indigo-500/30 bg-[#0a0a1a]/40 hover:bg-[#0a0a1a]/60 px-4 py-3 text-sm text-slate-300 inline-flex items-center gap-2 transition-colors">
                      {uploadingLogo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {logoUrl ? "Trocar logo" : "Enviar logo"}
                    </div>
                  </label>
                </div>
                {!logoUrl && (
                  <p className="text-[10px] text-rose-400/80">
                    Envie a logo da equipe para continuar.
                  </p>
                )}
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ob-pri" className="text-xs font-medium text-slate-300">
                    Cor primária
                  </Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-11 w-14 rounded-lg border border-indigo-500/20 bg-[#0a0a1a]/60 cursor-pointer"
                    />
                    <Input
                      id="ob-pri"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      pattern="^#[0-9a-fA-F]{6}$"
                      className="bg-[#0a0a1a]/60 border-indigo-500/20 text-white h-11 font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-acc" className="text-xs font-medium text-slate-300">
                    Cor de destaque
                  </Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-11 w-14 rounded-lg border border-indigo-500/20 bg-[#0a0a1a]/60 cursor-pointer"
                    />
                    <Input
                      id="ob-acc"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      pattern="^#[0-9a-fA-F]{6}$"
                      className="bg-[#0a0a1a]/60 border-indigo-500/20 text-white h-11 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-indigo-500/10 bg-[#0a0a1a]/60 p-4">
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-3">
                  Pré-visualização
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-md flex items-center justify-center font-bold text-white shrink-0"
                    style={{ background: primaryColor }}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      (teamName.slice(0, 1).toUpperCase() || "?")
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-white">{teamName || "Nome do time"}</div>
                    <div
                      className="text-xs font-semibold"
                      style={{ color: accentColor }}
                    >
                      Esports Operations
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="h-11 border-indigo-500/20 bg-transparent text-slate-300 hover:bg-[#0a0a1a]/60 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <Button
                  onClick={() => {
                    if (!logoUrl) {
                      toast.error("Envie a logo da equipe para continuar.");
                      return;
                    }
                    setStep(3);
                  }}
                  disabled={!logoUrl}
                  className="h-11 bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Roster inicial</h1>
                <p className="mt-2 text-sm text-slate-400">
                  Adicione seus jogadores agora ou pule esta etapa — você poderá editar tudo depois.
                </p>
              </div>

              <div className="space-y-2">
                {roster.map((r, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center rounded-lg border border-indigo-500/10 bg-[#0a0a1a]/40 p-2"
                  >
                    <Input
                      value={r.name}
                      onChange={(e) => updateRoster(idx, { name: e.target.value })}
                      placeholder="Nome"
                      className="col-span-4 bg-[#0a0a1a]/60 border-indigo-500/20 text-white h-10 text-sm"
                    />
                    <Input
                      value={r.ign}
                      onChange={(e) => updateRoster(idx, { ign: e.target.value })}
                      placeholder="IGN"
                      className="col-span-4 bg-[#0a0a1a]/60 border-indigo-500/20 text-white h-10 text-sm"
                    />
                    <select
                      value={r.lane}
                      onChange={(e) =>
                        updateRoster(idx, { lane: e.target.value as Lane | "" })
                      }
                      className="col-span-3 h-10 rounded-md bg-[#0a0a1a]/60 border border-indigo-500/20 text-white text-sm px-2 capitalize"
                    >
                      <option value="">— rota —</option>
                      {LANES.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeRosterRow(idx)}
                      className="col-span-1 h-10 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addRosterRow}
                  disabled={roster.length >= 20}
                  className="w-full h-10 border-dashed border-indigo-500/30 bg-transparent text-slate-300 hover:bg-[#0a0a1a]/60 hover:text-white"
                >
                  <Plus className="h-4 w-4 mr-2" /> Adicionar jogador
                </Button>
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  disabled={submitting}
                  className="h-11 border-indigo-500/20 bg-transparent text-slate-300 hover:bg-[#0a0a1a]/60 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="h-11 bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      Finalizar e entrar <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
