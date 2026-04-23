import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export function TeamSettingsManager() {
  const { data, isLoading } = useTeamSettings();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#7C3AED");
  const [accentColor, setAccentColor] = useState("#F59E0B");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data) {
      setTeamName(data.team_name);
      setDescription(data.description ?? "");
      setPrimaryColor(data.primary_color);
      setAccentColor(data.accent_color);
      setLogoUrl(data.logo_url);
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("Configurações ainda não carregadas");
      const { error } = await supabase
        .from("team_settings")
        .update({
          team_name: teamName.trim() || "Time",
          description: description.trim() || null,
          primary_color: primaryColor,
          accent_color: accentColor,
          logo_url: logoUrl,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["team-settings"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  async function handleUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem (PNG, JPG, SVG, WEBP)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 2MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("team-assets")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("team-assets").getPublicUrl(path);
      setLogoUrl(pub.publicUrl);
      toast.success("Logo enviado — clique em Salvar para confirmar");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6 border-border">
        <div className="text-xs text-muted-foreground">Carregando configurações...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-border space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-display text-xl tracking-wider">CONFIGURAÇÕES DO TIME</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Identidade visual exibida no header, na tela de login e em relatórios.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
        {/* Logo */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.2em]">Logo</Label>
          <div className="aspect-square rounded-lg border border-border bg-muted/20 flex items-center justify-center overflow-hidden relative">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo do time" className="w-full h-full object-contain p-3" />
            ) : (
              <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            {logoUrl ? "Trocar logo" : "Enviar logo"}
          </Button>
          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setLogoUrl(null)}
            >
              Remover
            </Button>
          )}
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="team-name">Nome do time</Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={60}
              placeholder="Ex.: DragoUnite Y"
            />
          </div>
          <div>
            <Label htmlFor="team-desc">Descrição</Label>
            <Textarea
              id="team-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={240}
              rows={3}
              placeholder="Breve descrição do time (até 240 caracteres)"
            />
            <div className="text-[10px] text-muted-foreground mt-1 text-right">
              {description.length}/240
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="primary-color">Cor primária</Label>
              <div className="flex items-center gap-2">
                <input
                  id="primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-12 rounded-md border border-border bg-transparent cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  maxLength={9}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="accent-color">Cor de destaque</Label>
              <div className="flex items-center gap-2">
                <input
                  id="accent-color"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-9 w-12 rounded-md border border-border bg-transparent cursor-pointer"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  maxLength={9}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-border bg-muted/10 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Pré-visualização
            </div>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-12 w-12 object-contain" />
              ) : (
                <div
                  className="h-12 w-12 rounded-md flex items-center justify-center font-display text-lg"
                  style={{ background: primaryColor, color: "#fff" }}
                >
                  {teamName.slice(0, 1).toUpperCase() || "T"}
                </div>
              )}
              <div>
                <div className="font-display text-xl tracking-wider">
                  {teamName || "Nome do time"}
                </div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Pokémon Unite Team OPS
                </div>
              </div>
              <span
                className="ml-auto inline-block h-6 w-6 rounded-full border border-border"
                style={{ background: accentColor }}
                title="Cor de destaque"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (data) {
                  setTeamName(data.team_name);
                  setDescription(data.description ?? "");
                  setPrimaryColor(data.primary_color);
                  setAccentColor(data.accent_color);
                  setLogoUrl(data.logo_url);
                }
              }}
            >
              Descartar
            </Button>
            <Button
              type="button"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || uploading}
              className="bg-gradient-primary"
            >
              {saveMut.isPending ? "Salvando..." : "Salvar configurações"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
