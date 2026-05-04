import { Instagram, Twitter, Youtube, Twitch, Mail } from "lucide-react";

const socials = [
  { name: "Instagram", icon: Instagram, href: "#", handle: "@dragounite" },
  { name: "Twitter / X", icon: Twitter, href: "#", handle: "@dragounite" },
  { name: "YouTube", icon: Youtube, href: "#", handle: "/dragounite" },
  { name: "Twitch", icon: Twitch, href: "#", handle: "/dragounite" },
];

export function ContactSection() {
  return (
    <section id="contato" className="py-24 relative">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[800px] rounded-full bg-red-600/20 blur-3xl" />
      </div>
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.3em] text-red-500 mb-3 font-bold">
            Contato
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase">
            Acompanhe o <span className="text-red-500">Dragounite</span>
          </h2>
          <p className="mt-4 text-zinc-400">
            Siga nossas redes, assista nossas partidas e faça parte da torcida.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {socials.map((s) => {
            const Icon = s.icon;
            return (
              <a
                key={s.name}
                href={s.href}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center hover:border-red-600/50 transition-all hover:-translate-y-1"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-red-600/10 border border-red-600/30 mb-3 group-hover:bg-red-600/20 transition-colors">
                  <Icon className="h-5 w-5 text-red-500" strokeWidth={2.5} />
                </div>
                <div className="text-sm font-black text-white uppercase tracking-tight">
                  {s.name}
                </div>
                <div className="text-xs text-zinc-500 mt-1">{s.handle}</div>
              </a>
            );
          })}
        </div>

        <div className="rounded-xl border border-red-600/30 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 text-center">
          <Mail className="h-6 w-6 text-red-500 mx-auto mb-3" strokeWidth={2.5} />
          <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">
            Parcerias & Patrocínios
          </h3>
          <p className="text-zinc-400 mb-4">
            Quer apoiar o Dragounite ou propor uma parceria? Entre em contato.
          </p>
          <a
            href="mailto:contato@dragounite.com"
            className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-all"
          >
            contato@dragounite.com
          </a>
        </div>
      </div>
    </section>
  );
}
