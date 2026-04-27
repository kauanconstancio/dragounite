import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-800/60 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-white">
              Gym<span className="text-indigo-400">Ly</span>
            </span>
            <span className="text-xs text-slate-500 ml-2">
              · Gestão competitiva para times de esports
            </span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Recursos</a>
            <a href="#roadmap" className="hover:text-white transition-colors">Roadmap</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <Link to="/auth" className="hover:text-white transition-colors">Entrar</Link>
          </nav>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800/60 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} GymLy · Feito para times competitivos
        </div>
      </div>
    </footer>
  );
}
