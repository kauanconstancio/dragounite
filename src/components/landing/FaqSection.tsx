import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "O que é o Dragounite?",
    a: "Dragounite é um time competitivo de esports e card games — e também o nome da plataforma que construímos para gerenciar nosso roster, scrims, drafts, scouting e estatísticas. Competimos oficialmente em Pokémon Unite, Rematch, Pokémon GO, Pokémon TCG, VGC e One Piece TCG.",
  },
  {
    q: "Posso usar a plataforma se não sou do Dragounite?",
    a: "Sim. A plataforma é multi-time. Durante o early access liberamos acesso para times convidados via waitlist. Cada organização tem dados isolados e seguros.",
  },
  {
    q: "Quais jogos a plataforma suporta hoje?",
    a: "Pokémon Unite está totalmente em produção. Os módulos para Rematch, Pokémon GO, TCG, VGC e One Piece TCG estão sendo lançados em ondas — veja o roadmap acima.",
  },
  {
    q: "Preciso pagar?",
    a: "Durante o early access o acesso é gratuito para times selecionados. Quando lançarmos oficialmente teremos planos free e pago, e quem entrar agora terá benefícios vitalícios.",
  },
  {
    q: "Como meu time se cadastra?",
    a: "Entre na waitlist com seu email e nome do time. Liberamos acessos em ondas, priorizando times competitivos ativos. Assim que sua vaga for aprovada, você cria sua organização e adiciona os jogadores.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Infraestrutura enterprise-grade com criptografia, controle de acesso por papel (coach, jogador, viewer) e Row-Level Security no banco. Cada time só enxerga os próprios dados.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.3em] text-red-500 mb-3 font-bold">FAQ</div>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase">
            Perguntas frequentes
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-6 !border-b hover:border-red-600/40 transition-colors"
            >
              <AccordionTrigger className="text-left text-white hover:no-underline py-5 font-bold uppercase tracking-tight">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-zinc-400 leading-relaxed pb-5">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
