import { Link } from "@tanstack/react-router";
import dragouniteLogo from "@/assets/dragounite-logo.png";

export function LandingFooter() {
  return (
    <footer className="border-t border-red-600/20 py-12 bg-[#0f0d0e]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 flex items-center justify-center">
              <img src={dragouniteLogo} alt="Dragounite" className="h-full w-full object-contain drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
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
            <Link to="/adm" className="hover:text-red-400 transition-colors">Área dos ADM</Link>
          </nav>
        </div>

        <div className="mt-8 pt-8 border-t border-zinc-900 text-center text-xs text-zinc-600 uppercase tracking-widest">
          © {new Date().getFullYear()} Dragounite · Forjados para vencer
        </div>
      </div>
    </footer>
  );
}
