import { useEffect } from "react";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";

// Convert #RRGGBB → oklch(L C H) string
function hexToOklch(hex: string): { l: number; c: number; h: number } | null {
  const m = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;

  // sRGB → linear
  const toLin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lr = toLin(r), lg = toLin(g), lb = toLin(b);

  // linear sRGB → OKLab (Björn Ottosson)
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return { l: L, c: C, h: H };
}

function oklchStr(l: number, c: number, h: number, alpha?: number) {
  const base = `${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(2)}`;
  return alpha === undefined ? `oklch(${base})` : `oklch(${base} / ${alpha})`;
}

function relLum(hex: string): number {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const toLin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

function contrast(lumA: number, lumB: number) {
  const [hi, lo] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (hi + 0.05) / (lo + 0.05);
}

// Pure-white & pure-black approx luminance
const WHITE_LUM = 1;
const BLACK_LUM = 0;

/** Pick foreground (white vs near-black) that maximizes contrast against `bgHex`. WCAG AA target ≥ 4.5. */
function pickForeground(bgHex: string): { token: string; useDark: boolean } {
  const bgL = relLum(bgHex);
  const cWhite = contrast(bgL, WHITE_LUM);
  const cBlack = contrast(bgL, BLACK_LUM);
  // Prefer the higher-contrast option; tie-break to white for vibrant colors
  const useDark = cBlack > cWhite;
  return {
    token: useDark ? "oklch(0.13 0.005 25)" : "oklch(0.985 0.005 90)",
    useDark,
  };
}

/** Tone a hex toward a target luminance for use as on-dark accent text (links/badges). */
function tonedForOnDark(p: { l: number; c: number; h: number }, bgHex: string) {
  // Walk lightness up until contrast vs bg ≥ 4.5
  const bgL = relLum(bgHex);
  let l = Math.max(p.l, 0.6);
  for (let i = 0; i < 12; i++) {
    // approximate luminance from oklch L (close enough for monotonic check)
    if (contrast(bgL, Math.min(1, Math.pow(l, 2.2))) >= 4.5) break;
    l = Math.min(0.95, l + 0.04);
  }
  return oklchStr(l, p.c * 0.85, p.h);
}

export function ThemeApplier() {
  const { data } = useTeamSettings();
  const { team } = useCurrentTeam();

  useEffect(() => {
    const root = document.documentElement;
    // Prefer active team's branding; fallback to global team_settings.
    const primaryHex = team?.primary_color ?? data?.primary_color ?? "#DC2626";
    const accentHex = team?.accent_color ?? data?.accent_color ?? "#FBBF24";

    const p = hexToOklch(primaryHex);
    const a = hexToOklch(accentHex);
    if (!p || !a) return;

    const primary = oklchStr(p.l, p.c, p.h);
    const primaryDark = oklchStr(Math.max(0.18, p.l - 0.18), p.c * 0.9, p.h);
    const primaryFg = pickForeground(primaryHex).token;

    const gold = oklchStr(a.l, a.c, a.h);
    const goldFg = pickForeground(accentHex).token;

    // Background hex (dark surface) ≈ what's in :root
    const surfaceHex = "#1f1a1a";
    const primaryOnDark = tonedForOnDark(p, surfaceHex);
    const goldOnDark = tonedForOnDark(a, surfaceHex);

    // Core tokens
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--primary-foreground", primaryFg);
    root.style.setProperty("--ring", primary);
    root.style.setProperty("--destructive", primary);
    root.style.setProperty("--destructive-foreground", primaryFg);

    root.style.setProperty("--gold", gold);
    root.style.setProperty("--gold-foreground", goldFg);

    // Accessible "on dark surface" variants — used for links, badge text, inline accents
    root.style.setProperty("--primary-on-dark", primaryOnDark);
    root.style.setProperty("--gold-on-dark", goldOnDark);

    // Charts
    root.style.setProperty("--chart-1", primary);
    root.style.setProperty("--chart-2", gold);
    root.style.setProperty("--chart-3", primaryDark);
    root.style.setProperty(
      "--chart-4",
      oklchStr(Math.min(0.85, a.l + 0.05), a.c * 0.75, a.h),
    );
    root.style.setProperty("--chart-5", oklchStr(Math.max(0.25, p.l - 0.25), p.c * 0.6, p.h));

    // Gradients
    root.style.setProperty(
      "--gradient-primary",
      `linear-gradient(135deg, ${primary}, ${primaryDark})`,
    );
    root.style.setProperty(
      "--gradient-gold",
      `linear-gradient(135deg, ${gold}, ${oklchStr(Math.max(0.55, a.l - 0.15), a.c, Math.max(0, a.h - 15))})`,
    );

    // Background ambient glow (arena)
    root.style.setProperty(
      "--gradient-arena",
      `radial-gradient(circle at 20% 0%, ${oklchStr(Math.max(0.22, p.l - 0.3), p.c * 0.5, p.h, 0.4)}, transparent 50%), radial-gradient(circle at 80% 100%, ${oklchStr(Math.max(0.25, a.l - 0.55), a.c * 0.35, a.h, 0.18)}, transparent 50%)`,
    );

    // Shadows
    root.style.setProperty("--shadow-glow", `0 0 40px ${oklchStr(p.l, p.c, p.h, 0.35)}`);
    root.style.setProperty("--shadow-gold", `0 0 30px ${oklchStr(a.l, a.c, a.h, 0.25)}`);

    // Force a repaint on body background so arena gradient updates
    document.body.style.backgroundImage = "var(--gradient-arena)";
  }, [data?.primary_color, data?.accent_color, team?.primary_color, team?.accent_color]);

  return null;
}
