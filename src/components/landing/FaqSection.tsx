import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "O que é o GymLy?",
    a: "GymLy é uma plataforma SaaS de gestão competitiva para times de esports. Centralizamos roster, scrims, drafts, scouting e dashboards de performance — tudo guiado por dados. Começamos com Pokémon Unite e expandiremos para outros jogos.",
  },
  {
    q: "Preciso pagar para usar?",
    a: "Durante o early access, o acesso é gratuito para times selecionados da waitlist. Quando lançarmos oficialmente, teremos planos free e pago — quem entrar agora terá benefícios exclusivos.",
  },
  {
    q: "Como meu time se cadastra?",
    a: "Entre na waitlist com seu email e nome do time. Vamos liberar acessos em ondas, priorizando times competitivos ativos. Assim que sua vaga for liberada, você cria sua organização e adiciona os jogadores.",
  },
  {
    q: "Vocês vão suportar outros jogos?",
    a: "Sim. Nosso roadmap inclui League of Legends, Valorant e Rainbow Six. A arquitetura do GymLy foi pensada desde o início para múltiplos esports.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Usamos infraestrutura enterprise-grade com criptografia, controle de acesso por papel (coach, jogador, viewer) e Row-Level Security no banco. Cada time só enxerga os próprios dados.",
  },
  {
    q: "Posso usar para um time amador ou só profissional?",
    a: "Para qualquer time competitivo — amador, semi-pro, profissional, acadêmico. Se vocês fazem scrims e querem evoluir, GymLy serve.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.3em] text-indigo-400 mb-3">FAQ</div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Perguntas frequentes
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-6 !border-b"
            >
              <AccordionTrigger className="text-left text-white hover:no-underline py-5">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-slate-400 leading-relaxed pb-5">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
