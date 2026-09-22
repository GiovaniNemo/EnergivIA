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
  TrendingUp,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { HowItWorksTabs } from "@/components/landing/how-it-works-tabs";
import { ConvergingPanelsSection } from "@/components/landing/converging-panels-section";
import { BeamqHeroSection } from "@/components/landing/beamq-hero-section";

const btnBase =
  "inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2";
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
    <div className="landing-page min-h-screen flex flex-col bg-[#050811] text-white antialiased selection:bg-amber-400/20 selection:text-amber-200">
      {/* ------------------------------------------------------------- */}
      {/* HERO SECTION                                                  */}
      {/* ------------------------------------------------------------- */}
      <BeamqHeroSection />

      <main className="flex-1">
        <HowItWorksTabs />

        {/* ------------------------------------------------------------- */}
        {/* BENEFÍCIOS / RESULTADOS                                       */}
        {/* ------------------------------------------------------------- */}
        <section
          id="beneficios"
          className="relative overflow-hidden border-y border-slate-800 bg-gradient-to-b from-[#090D15] via-[#0C121E] to-[#090D15] px-4 py-20 sm:px-6 sm:py-24"
        >
          <div className="relative mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
                <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                Resultados comprovados
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Impacto real na operação de integradores solares
              </h2>
              <p className="mt-4 text-base text-slate-300">
                Integradores em todo o Brasil usam a plataforma para responder mais rápido,
                profissionalizar propostas e converter mais vendas.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  value: "< 2 min",
                  label: "Para gerar uma proposta completa",
                  accent: "text-amber-300",
                },
                {
                  value: "3 passos",
                  label: "Da conta de luz ao PDF final",
                  accent: "text-emerald-400",
                },
                {
                  value: "1 fluxo",
                  label: "Chat, kit e proposta no mesmo canal",
                  accent: "text-amber-300",
                },
                {
                  value: "No mesmo dia",
                  label: "Primeira proposta após configurar",
                  accent: "text-emerald-400",
                },
              ].map((item) => (
                <article
                  key={item.label}
                  className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 text-center shadow-lg transition-transform duration-200 hover:-translate-y-0.5 hover:border-slate-700"
                >
                  <p className={`text-3xl font-extrabold sm:text-4xl ${item.accent}`}>
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">{item.label}</p>
                </article>
              ))}
            </div>

            <figure className="mt-9 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-lg">
              <blockquote className="text-base text-slate-200 sm:text-lg">
                "Antes levávamos horas para montar proposta. Hoje respondemos no mesmo atendimento e
                percebemos aumento real de fechamento."
              </blockquote>
              <figcaption className="mt-3 text-sm font-semibold text-amber-300">
                Rafael Martins — Integrador Solar Horizonte
              </figcaption>
            </figure>

            <div className="mt-9 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-5 shadow-sm">
              <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                Integradores e parceiros que confiam na operação
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                {["Solar Prime", "Energia+ Brasil", "Grupo Aurora", "Lumen Engenharia"].map(
                  (name) => (
                    <span key={name} className="text-sm font-semibold text-slate-400">
                      {name}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        <ConvergingPanelsSection />

        {/* ------------------------------------------------------------- */}
        {/* DIFERENCIAIS                                                  */}
        {/* ------------------------------------------------------------- */}
        <section
          id="diferenciais"
          className="relative overflow-hidden border-t border-slate-800 bg-[#080C14] px-4 py-20 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="relative mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Diferenciais reais
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                O que torna a EnergivIA diferente
              </h2>
              <p className="mt-4 text-base text-slate-300">
                Não é só uma ferramenta de proposta. Você opera o ciclo comercial completo com IA,
                velocidade e execução no canal que o cliente já usa.
              </p>
            </div>

            <div className="relative mt-10 grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: FaWhatsapp,
                  title: "Fluxo completo no WhatsApp",
                  description:
                    "Da conta de luz ao envio da proposta: seu time executa tudo no WhatsApp, com menos troca de ferramenta.",
                  accent: "text-emerald-400 bg-emerald-500/10",
                },
                {
                  icon: FileSearch,
                  title: "IA que lê a conta automaticamente",
                  description:
                    "A plataforma extrai dados da fatura, monta base técnica e acelera a simulação sem depender de digitação manual.",
                  accent: "text-amber-400 bg-amber-400/10",
                },
                {
                  icon: Gauge,
                  title: "Velocidade para responder em minutos",
                  description:
                    "Enquanto outros ainda montam planilha, você já apresenta simulação, kit sugerido e proposta pronta para o cliente.",
                  accent: "text-emerald-400 bg-emerald-500/10",
                },
                {
                  icon: Workflow,
                  title: "Operação ponta a ponta, não só proposta",
                  description:
                    "Conecta atendimento, simulação, proposta e acompanhamento comercial no mesmo fluxo para aumentar conversão.",
                  accent: "text-amber-400 bg-amber-400/10",
                },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className={[
                      "group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-700",
                      index === 0 || index === 3 ? "md:col-span-2" : "",
                    ].join(" ")}
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.accent} transition-transform duration-200 group-hover:scale-105`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold leading-tight text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
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
          className="relative overflow-hidden border-y border-slate-800 bg-[#090D16] px-4 py-20 sm:px-6 sm:py-24"
        >
          <div className="relative mx-auto max-w-4xl">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                FAQ
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Dúvidas frequentes sobre a EnergivIA
              </h2>
              <p className="mt-4 text-base text-slate-300">
                Respostas rápidas para você entender como funciona a operação com IA no dia a dia do
                integrador solar.
              </p>
            </div>

            <div className="mt-10 space-y-3">
              {faqItems.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 shadow-sm transition-all duration-200 hover:border-slate-700"
                >
                  <summary className="cursor-pointer list-none pr-6 text-left text-base font-semibold text-white marker:content-none">
                    {item.question}
                    <span className="float-right text-slate-400 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.answer}</p>
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
          className="relative overflow-hidden border-t border-slate-800 bg-[#070A10] px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="relative z-10 mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-[#0D1424] p-8 text-center shadow-2xl sm:p-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
              <Sun className="h-3.5 w-3.5 text-amber-400" />
              Próximo passo
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Pronto para acelerar suas vendas solares?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-300">
              Entre agora e transforme atendimento em proposta enviada em minutos, com mais
              previsibilidade para o seu time comercial.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href={appLoginUrl}
                className={`${btnBase} bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold w-full min-w-[200px] sm:w-auto shadow-lg transition-all`}
              >
                Criar conta grátis
              </a>
              <a
                href="https://wa.me/5544988117969?text=Ol%C3%A1!%20Gostaria%20de%20ver%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergivIA."
                target="_blank"
                rel="noopener noreferrer"
                className={`${btnBase} w-full min-w-[200px] border border-amber-400/40 bg-amber-400/10 text-center text-amber-200 hover:bg-amber-400/20 sm:w-auto transition-all`}
              >
                Ver demonstração
              </a>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* SEO ARTICLES & LINKS                                          */}
        {/* ------------------------------------------------------------- */}
        <section className="relative overflow-hidden border-t border-slate-800 bg-[#080B12] px-4 py-16 sm:px-6 sm:py-20">
          <div className="relative mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm sm:p-8">
            <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
              Conteúdo para integradores
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Software para integradores solares: como gerar propostas mais rápido
            </h2>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-emerald-400 to-amber-400" />
            <div className="mt-6 grid gap-5 text-sm leading-relaxed text-slate-300 sm:text-base md:grid-cols-2">
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
                    className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 transition-all hover:-translate-y-0.5 hover:border-slate-700"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-amber-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-400 sm:text-sm">{item.description}</p>
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
        <footer className="border-t border-slate-800 bg-[#070A10] px-4 py-12 sm:px-6 text-slate-300">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <Link href="/" className="flex items-center">
                <Image
                  src="/logo-dark.png"
                  alt="EnergiVIA"
                  width={480}
                  height={136}
                  className="h-11 w-auto object-contain sm:h-12"
                  sizes="(max-width: 640px) 160px, 200px"
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
