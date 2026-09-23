import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  FileSearch,
  Gauge,
  Workflow,
  FileText,
  BarChart2,
  Laptop,
  Users,
  Sun,
  Zap,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { HowItWorksTabs } from "@/components/landing/how-it-works-tabs";
import { ConvergingPanelsSection } from "@/components/landing/converging-panels-section";
import { BeamqHeroSection } from "@/components/landing/beamq-hero-section";
import { ImpactResultsSection } from "@/components/landing/impact-results-section";

const appLoginUrl = "/login";

const faqItems = [
  {
    question: "Em quanto tempo consigo gerar a primeira proposta?",
    answer:
      "Após configurar sua conta, você já consegue enviar a conta de luz e gerar a primeira proposta no mesmo dia. Em muitos casos, o processo completo leva menos de 2 minutos.",
  },
  {
    question: "Preciso sair do WhatsApp para operar o fluxo comercial?",
    answer:
      "Não. O fluxo foi pensado para acontecer no WhatsApp: coleta de informações, simulação, seleção de kit e envio da proposta, reduzindo troca de ferramenta e retrabalho.",
  },
  {
    question: "A plataforma substitui meu time comercial?",
    answer:
      "Não. A EnergivIA acelera tarefas operacionais e padroniza a execução para que seu time comercial foque em atendimento, negociação e fechamento.",
  },
  {
    question: "Posso personalizar as propostas com a minha marca?",
    answer:
      "Sim. Você pode ajustar identidade visual, conteúdo e estrutura das propostas para manter consistência com a comunicação da sua empresa.",
  },
] as const;

export const metadata: Metadata = {
  title: "EnergivIA | Software e IA para Integradores de Energia Solar",
  description:
    "Gere propostas comerciais solares completas em segundos, simule economia com inteligência artificial e aumente as conversões da sua empresa de energia solar.",
  openGraph: {
    title: "EnergivIA | Software e IA para Integradores de Energia Solar",
    description:
      "Gere propostas comerciais solares completas em segundos, simule economia com inteligência artificial e aumente suas conversões.",
    images: ["/og/og-image-1200x630.jpg"],
  },
};

export default function HomePage(): JSX.Element {
  return (
    <div className="landing-page min-h-screen flex flex-col bg-[#02040a] text-white antialiased font-plus-jakarta selection:bg-[#10b981]/30 selection:text-white">
      {/* ------------------------------------------------------------- */}
      {/* HERO SECTION                                                  */}
      {/* ------------------------------------------------------------- */}
      <BeamqHeroSection />

      <main className="flex-1">
        <HowItWorksTabs />

        {/* ------------------------------------------------------------- */}
        {/* BENEFÍCIOS / RESULTADOS COM ANIMAÇÃO                          */}
        {/* ------------------------------------------------------------- */}
        <ImpactResultsSection />

        <ConvergingPanelsSection />

        {/* ------------------------------------------------------------- */}
        {/* DIFERENCIAIS                                                  */}
        {/* ------------------------------------------------------------- */}
        <section
          id="diferenciais"
          className="relative overflow-hidden border-t border-white/5 bg-[#02040a] px-4 py-20 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="relative mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                Diferenciais reais
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                O que torna a EnergivIA diferente
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-400 font-light">
                Não é só uma ferramenta de proposta. Você opera o ciclo comercial completo com IA,
                velocidade e execução no canal que o cliente já usa.
              </p>
            </div>

            <div className="relative mt-12 grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: FaWhatsapp,
                  title: "Fluxo completo no WhatsApp",
                  description:
                    "Da conta de luz ao envio da proposta: seu time executa tudo no WhatsApp, com menos troca de ferramenta.",
                  accent: "text-emerald-400 bg-emerald-950/40 border border-emerald-500/20",
                },
                {
                  icon: FileSearch,
                  title: "IA que lê a conta automaticamente",
                  description:
                    "A plataforma extrai dados da fatura, monta base técnica e acelera a simulação sem depender de digitação manual.",
                  accent: "text-teal-400 bg-teal-950/40 border border-teal-500/20",
                },
                {
                  icon: Gauge,
                  title: "Velocidade para responder em minutos",
                  description:
                    "Enquanto outros ainda montam planilha, você já apresenta simulação, kit sugerido e proposta pronta para o cliente.",
                  accent: "text-emerald-400 bg-emerald-950/40 border border-emerald-500/20",
                },
                {
                  icon: Workflow,
                  title: "Operação ponta a ponta, não só proposta",
                  description:
                    "Conecta atendimento, simulação, proposta e acompanhamento comercial no mesmo fluxo para aumentar conversão.",
                  accent: "text-teal-400 bg-teal-950/40 border border-teal-500/20",
                },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className={[
                      "group relative overflow-hidden rounded-3xl border border-white/10 bg-[#070b14]/80 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.12)] backdrop-blur-md",
                      index === 0 || index === 3 ? "md:col-span-2" : "",
                    ].join(" ")}
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.accent} transition-transform duration-200 group-hover:scale-105 shadow-sm`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold leading-tight text-white group-hover:text-emerald-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400 font-light">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* FAQ                                                           */}
        {/* ------------------------------------------------------------- */}
        <section
          id="faq"
          className="relative overflow-hidden border-y border-white/5 bg-[#02040a] px-4 py-20 sm:px-6 sm:py-24"
        >
          <div className="relative mx-auto max-w-4xl">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                FAQ
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                Dúvidas frequentes sobre a EnergivIA
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-400 font-light">
                Respostas rápidas para você entender como funciona a operação com IA no dia a dia do
                integrador solar.
              </p>
            </div>

            <div className="mt-10 space-y-3.5">
              {faqItems.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-2xl border border-white/10 bg-[#070b14]/70 px-6 py-4 shadow-sm transition-all duration-200 hover:border-emerald-500/30 backdrop-blur-md"
                >
                  <summary className="cursor-pointer list-none pr-6 text-left text-base font-semibold text-white marker:content-none flex items-center justify-between">
                    <span>{item.question}</span>
                    <span className="text-emerald-400 transition-transform duration-200 group-open:rotate-45 text-xl font-light">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400 font-light">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* PRÓXIMO PASSO (CTA)                                          */}
        {/* ------------------------------------------------------------- */}
        <section
          id="para-quem"
          className="relative overflow-hidden border-t border-white/5 bg-[#02040a] px-4 py-16 sm:px-6 sm:py-24"
        >
          <div className="relative z-10 mx-auto max-w-4xl rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-[#061c16] via-[#04120e] to-[#02040a] p-8 text-center shadow-[0_0_60px_rgba(16,185,129,0.12)] sm:p-12 backdrop-blur-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Sun className="h-3.5 w-3.5 text-emerald-400" />
              Próximo passo
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Pronto para acelerar suas vendas solares?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-300 font-light text-base sm:text-lg">
              Entre agora e transforme atendimento em proposta enviada em minutos, com mais
              previsibilidade para o seu time comercial.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href={appLoginUrl}
                className="w-full sm:w-auto bg-white text-black font-semibold rounded-full px-8 py-3.5 hover:scale-105 transition-transform duration-300 shadow-[0_0_25px_rgba(255,255,255,0.4)] text-[15px]"
              >
                Criar conta grátis
              </a>
              <a
                href="https://wa.me/5544988117969?text=Ol%C3%A1!%20Gostaria%20de%20ver%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergivIA."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-white/10 backdrop-blur-md border border-white/20 text-white font-medium rounded-full px-8 py-3.5 hover:bg-white/20 transition-all duration-300 text-[15px]"
              >
                Ver demonstração
              </a>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* SEO ARTICLES & LINKS                                          */}
        {/* ------------------------------------------------------------- */}
        <section className="relative overflow-hidden border-t border-white/5 bg-[#02040a] px-4 py-16 sm:px-6 sm:py-20">
          <div className="relative mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[#070b14]/70 p-6 shadow-xl sm:p-8 backdrop-blur-md">
            <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              Conteúdo para integradores
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Software para integradores solares: como gerar propostas mais rápido
            </h2>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-emerald-400 via-teal-500 to-lime-500" />
            <div className="mt-6 grid gap-5 text-sm leading-relaxed text-slate-400 font-light sm:text-base md:grid-cols-2">
              <p>
                Muitos integradores ainda perdem tempo com processos manuais para montar propostas
                de energia solar. Entre planilhas, troca de mensagens e revisão de dados, o ciclo
                comercial fica lento e aumenta o risco de erro no momento mais sensível da venda.
              </p>
              <p>
                Com um software para integradores solares, a simulação acontece de forma mais
                estruturada: você recebe os dados da conta, valida as informações principais e
                transforma isso em proposta com parâmetros técnicos e financeiros consistentes para
                apresentar ao cliente.
              </p>
              <p>
                Em operações comerciais, velocidade de resposta impacta diretamente a conversão.
                Quanto mais rápido seu time envia uma proposta clara, maior a chance de manter o
                interesse do lead e avançar para fechamento sem perder espaço para concorrentes.
              </p>
              <p>
                O diferencial da EnergivIA é unir IA e WhatsApp no mesmo fluxo de execução. Assim, o
                integrador consegue atender, simular e enviar propostas no canal que o cliente já
                usa, com menos fricção operacional e mais produtividade para o time comercial.
              </p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                {
                  href: "/proposta-energia-solar",
                  title: "Proposta de energia solar",
                  description: "Como reduzir tempo de entrega e manter padrão técnico.",
                  icon: FileText,
                },
                {
                  href: "/simulacao-energia-solar",
                  title: "Simulação de energia solar",
                  description: "Fluxo prático para responder leads com mais velocidade.",
                  icon: BarChart2,
                },
                {
                  href: "/software-integrador-solar",
                  title: "Software para integrador solar",
                  description: "Critérios para escolher uma plataforma que escala operação.",
                  icon: Laptop,
                },
                {
                  href: "/crm-energia-solar",
                  title: "CRM para energia solar",
                  description: "Como organizar funil e melhorar execução de follow-up.",
                  icon: Users,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#03060c] p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-950/50 border border-emerald-500/20 text-emerald-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-400 sm:text-sm font-light">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* FOOTER                                                        */}
        {/* ------------------------------------------------------------- */}
        <footer className="border-t border-white/5 bg-[#02040a] px-4 py-12 sm:px-6 text-slate-400">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <Link href="/" className="flex items-center">
                <Image
                  src="/logo-dark.png"
                  alt="EnergiVIA"
                  width={480}
                  height={136}
                  className="h-12 w-auto object-contain sm:h-14"
                  sizes="(max-width: 640px) 180px, 240px"
                />
              </Link>
              <nav className="flex flex-wrap items-center justify-center gap-5 text-sm">
                <a href="#como-funciona" className="hover:text-white transition-colors">
                  Como funciona
                </a>
                <a href="#beneficios" className="hover:text-white transition-colors">
                  Resultados
                </a>
                <a href="#cenarios" className="hover:text-white transition-colors">
                  Cenários
                </a>
                <a href="#diferenciais" className="hover:text-white transition-colors">
                  Diferenciais
                </a>
                <a href="#faq" className="hover:text-white transition-colors">
                  FAQ
                </a>
                <a
                  href="https://wa.me/5544988117969?text=Ol%C3%A1!%20Gostaria%20de%20ver%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergivIA."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Ver demonstração
                </a>
                <a href={appLoginUrl} className="hover:text-white transition-colors">
                  Criar conta
                </a>
                <Link href="/termos-de-uso" className="hover:text-white transition-colors">
                  Termos de Uso
                </Link>
                <Link href="/privacidade" className="hover:text-white transition-colors">
                  Privacidade
                </Link>
              </nav>
            </div>
            <p className="mt-8 text-center text-sm sm:text-left text-slate-400">
              © {new Date().getFullYear()} EnergiVIA. O seu parceiro via I.A. CNPJ:
              66.304.358/0001-16
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
