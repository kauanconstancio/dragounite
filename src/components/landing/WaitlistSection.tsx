import { WaitlistForm } from "./WaitlistForm";

export function WaitlistSection() {
  return (
    <section id="waitlist" className="py-24 relative">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[700px] rounded-full bg-indigo-600/20 blur-3xl" />
      </div>
      <div className="mx-auto max-w-2xl px-6">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-indigo-400 mb-3">
            Early access
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Seja um dos primeiros
          </h2>
          <p className="mt-4 text-slate-400">
            Times pioneiros recebem acesso antecipado e benefícios exclusivos quando lançarmos.
          </p>
        </div>

        <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-[#141432]/80 to-[#0a0a1a]/80 backdrop-blur-xl p-8 sm:p-10 shadow-2xl">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
