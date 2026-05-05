import { Link } from "@tanstack/react-router";
import dragouniteLogo from "@/assets/dragounite-logo.png";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0f0d0e]/80 border-b border-red-600/20">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5 group">
          <div className="h-10 w-10 flex items-center justify-center transition-transform group-hover:scale-110">
            <img src={dragouniteLogo} alt="Dragounite" className="h-full w-full object-contain drop-shadow-[0_0_12px_rgba(220,38,38,0.6)]" />
          </div>
          <span className="font-black text-xl tracking-tight text-white uppercase">
            Drago<span className="text-red-500">unite</span>
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300 uppercase tracking-wide">
          <a href="#sobre" className="hover:text-white transition-colors">Sobre</a>
          <a href="#jogos" className="hover:text-white transition-colors">Jogos</a>
          <a href="#conquistas" className="hover:text-white transition-colors">Trajetória</a>
          <a href="#contato" className="hover:text-white transition-colors">Contato</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            className="hidden sm:inline-flex text-sm font-medium text-zinc-300 hover:text-white transition-colors uppercase tracking-wide"
          >
            Área do time
          </Link>
        </div>
      </div>
    </header>
  );
}
