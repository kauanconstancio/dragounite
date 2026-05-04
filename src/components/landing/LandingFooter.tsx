import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-red-600/20 py-12 bg-[#0f0d0e]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)]">
              <Flame className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-black text-white uppercase tracking-tight">
              Drago<span className="text-red-500">unite</span>
            </span>
            <span className="text-xs text-zinc-500 ml-2 hidden sm:inline">
              · Time competitivo de esports & TCG
            </span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-zinc-400 uppercase tracking-wide">
            <a href="#sobre" className="hover:text-red-400 transition-colors">Sobre</a>
            <a href="#jogos" className="hover:text-red-400 transition-colors">Jogos</a>
            <a href="#conquistas" className="hover:text-red-400 transition-colors">Trajetória</a>
            <a href="#contato" className="hover:text-red-400 transition-colors">Contato</a>
            <Link to="/auth" className="hover:text-red-400 transition-colors">Área do time</Link>
          </nav>
        </div>

        <div className="mt-8 pt-8 border-t border-zinc-900 text-center text-xs text-zinc-600 uppercase tracking-widest">
          © {new Date().getFullYear()} Dragounite · Forjados para vencer
        </div>
      </div>
    </footer>
  );
}
