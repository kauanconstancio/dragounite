import { WaitlistForm } from "./WaitlistForm";

export function WaitlistSection() {
  return (
    <section id="waitlist" className="py-24 relative">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[800px] rounded-full bg-red-600/25 blur-3xl" />
      </div>
      <div className="mx-auto max-w-2xl px-6">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-red-500 mb-3 font-bold">
            Recrutamento
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase">
            Entre na <span className="text-red-500">arena</span>
          </h2>
          <p className="mt-4 text-zinc-400">
            Times pioneiros recebem acesso antecipado e benefícios vitalícios quando lançarmos oficialmente.
          </p>
        </div>

        <div className="rounded-2xl border border-red-600/30 bg-gradient-to-br from-zinc-900 to-zinc-950 backdrop-blur-xl p-8 sm:p-10 shadow-[0_0_60px_rgba(220,38,38,0.15)]">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
