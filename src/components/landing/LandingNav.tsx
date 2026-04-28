import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0a1a]/70 border-b border-indigo-500/10">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.5)] group-hover:shadow-[0_0_30px_rgba(79,70,229,0.8)] transition-shadow">
            <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            Gym<span className="text-indigo-400">Ly</span>
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">Recursos</a>
          <a href="#how" className="hover:text-white transition-colors">Como funciona</a>
          <a href="#roadmap" className="hover:text-white transition-colors">Roadmap</a>
          <Link to="/planos" className="hover:text-white transition-colors">Planos</Link>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            className="hidden sm:inline-flex text-sm text-slate-300 hover:text-white transition-colors"
          >
            Entrar
          </Link>
          <Link
            to="/cadastro"
            className="hidden md:inline-flex text-sm text-indigo-300 hover:text-indigo-200 transition-colors"
          >
            Já fui aprovado
          </Link>
          <a
            href="#waitlist"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.7)] transition-all"
          >
            Entrar na waitlist
          </a>
        </div>
      </div>
    </header>
  );
}
