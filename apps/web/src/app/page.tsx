import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Check,
  FileSearch,
  Gauge,
  Workflow,
  FileText,
  BarChart2,
  Laptop,
  Users,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { HowItWorksTabs } from "@/components/landing/how-it-works-tabs";

const btnBase =
  "inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 focus-visible:ring-offset-2";
const btnPrimary =
  "bg-emerald-400 text-slate-950 shadow-[0_0_30px_-10px_rgba(52,211,153,0.8)] hover:-translate-y-0.5 hover:bg-emerald-300";
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
  title: "EnergivIA",
};

export default function HomePage(): JSX.Element {
  return (
    <div className="landing-light min-h-screen flex flex-col bg-slate-950 text-white antialiased">
      <div className="landing-hero relative overflow-hidden min-h-[85vh] flex flex-col bg-[#edf5f5]">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-teal-400/18 blur-[120px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(20,184,166,0.1),transparent_52%)]" />
        <header className="sticky top-0 z-50 flex shrink-0 bg-transparent">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="EnergiVIA"
                width={480}
                height={136}
                className="h-12 w-auto object-contain sm:h-14"
                priority
              />
            </Link>
            <nav className="hidden sm:flex items-center gap-1 text-sm text-slate-700">
              <a
                href="#como-funciona"
                className="px-3 py-2 rounded-full hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
              >
                Como Funciona
              </a>
              <span className="text-slate-400" aria-hidden>
                •
              </span>
              <a
                href="#beneficios"
                className="px-3 py-2 rounded-full hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
              >
                Resultados
              </a>
              <span className="text-slate-400" aria-hidden>
                •
              </span>
              <a
                href="#diferenciais"
                className="px-3 py-2 rounded-full hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
              >
                Diferenciais
              </a>
              <span className="text-slate-400" aria-hidden>
                •
              </span>
              <a
                href="#faq"
                className="px-3 py-2 rounded-full hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
              >
                FAQ
              </a>
            </nav>
            <a
              href={appLoginUrl}
              className={`${btnBase} min-w-[100px] border border-slate-300 bg-white/80 text-slate-800 hover:bg-white`}
            >
              Entrar
            </a>
          </div>
        </header>

        <div className="relative z-10 flex flex-1 items-center px-4 py-14 sm:px-6 sm:py-20 md:py-24">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mx-auto max-w-4xl text-center">
              <div style={{ animation: "fadeInUp 620ms ease-out both" }}>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl md:text-6xl">
                  Gere propostas solares completas em{" "}
                  <span className="bg-gradient-to-r from-emerald-500 to-sky-500 bg-clip-text text-transparent">
                    segundos
                  </span>{" "}
                  e feche mais vendas
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-base text-slate-500 sm:text-lg">
                  Pare de perder tempo montando proposta manual e responda seu cliente em minutos
                  com simulação, kit e proposta prontos para envio.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <a
                    href={appLoginUrl}
                    className={`${btnBase} min-h-12 w-full bg-[#0fb8a4] px-8 font-bold text-slate-950 shadow-xl shadow-emerald-400/40 hover:-translate-y-0.5 hover:bg-[#0da898] sm:w-auto sm:min-w-[260px]`}
                  >
                    Criar conta grátis
                  </a>
                  <a
                    href="https://wa.me/5544988117969?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergiVIA.%20Acredito%20que%20o%20produto%20de%20voc%C3%AAs%20%C3%A9%20incr%C3%ADvel%20e%20vai%20fazer%20a%20diferen%C3%A7a.%20Quando%20podemos%20conversar%3F"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${btnBase} min-h-12 w-full border-2 border-slate-400 bg-transparent px-8 text-slate-700 hover:-translate-y-0.5 hover:border-slate-600 hover:text-slate-900 sm:w-auto sm:min-w-[260px]`}
                  >
                    Ver demonstração
                  </a>
                </div>
                <div className="mt-5 flex flex-col items-center justify-center gap-2 text-sm text-slate-600 sm:flex-row sm:gap-8">
                  <p className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    Sem cartão de crédito
                  </p>
                  <p className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    Configuração em 2 min
                  </p>
                </div>
              </div>
            </div>
            <div
              className="relative mx-auto mt-8 w-full max-w-[1240px]"
              style={{ animation: "fadeInScale 760ms ease-out both" }}
            >
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/3 bg-gradient-to-t from-[#f3f8f8] to-transparent" />
              <Image
                src="/landing/demo.png"
                alt="Demonstração do painel da EnergivIA"
                width={1080}
                height={675}
                className="h-auto w-full object-contain"
                style={{ animation: "floatGentle 6s ease-in-out 900ms infinite" }}
                priority
              />
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1">
        <HowItWorksTabs />

        <section
          id="beneficios"
          className="relative overflow-hidden border-y border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_40%,#f8fafc_100%)] px-4 py-20 sm:px-6 sm:py-24"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_16%,rgba(20,184,166,0.08),transparent_36%),radial-gradient(circle_at_84%_20%,rgba(14,165,233,0.08),transparent_34%)]" />
          <div className="relative mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Resultados reais
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Prova social de quem já opera com a EnergivIA
              </h2>
              <p className="mt-4 text-base text-slate-600">
                Integradores em todo o Brasil usam a plataforma para responder mais rápido,
                profissionalizar propostas e converter mais vendas.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { value: "< 2 min", label: "Para gerar uma proposta completa" },
                { value: "3 passos", label: "Da conta de luz ao PDF final" },
                { value: "1 fluxo", label: "Chat, kit e proposta no mesmo processo" },
                { value: "No mesmo dia", label: "Primeira proposta após configurar" },
              ].map((item) => (
                <article
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <p className="text-2xl font-bold text-slate-900 sm:text-3xl">{item.value}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.label}</p>
                </article>
              ))}
            </div>

            <figure className="mt-9 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
              <blockquote className="text-base text-slate-700 sm:text-lg">
                "Antes levávamos horas para montar proposta. Hoje respondemos no mesmo atendimento e
                percebemos aumento real de fechamento."
              </blockquote>
              <figcaption className="mt-3 text-sm font-semibold text-slate-900">
                Rafael Martins - Integrador Solar Horizonte
              </figcaption>
            </figure>

            <div className="mt-9 rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
              <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
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

        <section
          id="diferenciais"
          className="relative overflow-hidden border-t border-slate-900 bg-slate-950 px-4 py-20 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div
              className="relative mx-auto max-w-3xl text-center"
              style={{ animation: "fadeInUp 620ms ease-out both" }}
            >
              <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 shadow-sm">
                Diferenciais reais
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                O que torna a EnergivIA diferente
              </h2>
              <p className="mt-4 text-base text-slate-400">
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
                },
                {
                  icon: FileSearch,
                  title: "IA que lê a conta automaticamente",
                  description:
                    "A plataforma extrai dados da fatura, monta base técnica e acelera a simulação sem depender de digitação manual.",
                },
                {
                  icon: Gauge,
                  title: "Velocidade para responder em minutos",
                  description:
                    "Enquanto outros ainda montam planilha, você já apresenta simulação, kit sugerido e proposta pronta para o cliente.",
                },
                {
                  icon: Workflow,
                  title: "Operação ponta a ponta, não só proposta",
                  description:
                    "Conecta atendimento, simulação, proposta e acompanhamento comercial no mesmo fluxo para aumentar conversão.",
                },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className={[
                      "group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/50",
                      index === 0 || index === 3 ? "md:col-span-2" : "",
                    ].join(" ")}
                    style={{
                      animation: "fadeInUp 700ms cubic-bezier(0.22,1,0.36,1) both",
                      animationDelay: `${index * 120}ms`,
                    }}
                  >
                    <div className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl transition group-hover:bg-emerald-400/20" />
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-emerald-300 transition-transform duration-200 group-hover:scale-105">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold leading-tight text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="relative overflow-hidden border-y border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_50%,#f8fafc_100%)] px-4 py-20 sm:px-6 sm:py-24"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(20,184,166,0.07),transparent_36%),radial-gradient(circle_at_84%_20%,rgba(14,165,233,0.07),transparent_34%)]" />
          <div className="relative mx-auto max-w-4xl">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                FAQ
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Dúvidas frequentes sobre a EnergivIA
              </h2>
              <p className="mt-4 text-base text-slate-600">
                Respostas rápidas para você entender como funciona a operação com IA no dia a dia do
                integrador solar.
              </p>
            </div>

            <div className="mt-10 space-y-3">
              {faqItems.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-200/70 transition-all duration-200 hover:border-emerald-200 hover:shadow-[0_10px_22px_rgba(15,23,42,0.08)]"
                >
                  <summary className="cursor-pointer list-none pr-6 text-left text-base font-semibold text-slate-900 marker:content-none">
                    {item.question}
                    <span className="float-right text-slate-400 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {}
        <section
          id="para-quem"
          className="relative overflow-hidden border-t border-slate-800 bg-slate-950 px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,rgba(20,184,166,0.14),transparent_38%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.12),transparent_36%)]" />
          <div className="relative z-10 mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-[0_18px_40px_rgba(2,6,23,0.3)] backdrop-blur-sm sm:p-10">
            <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
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
                className={`${btnBase} ${btnPrimary} w-full min-w-[200px] sm:w-auto`}
              >
                Criar conta grátis
              </a>
              <a
                href="https://wa.me/5544988117969?text=Ol%C3%A1!%20Gostaria%20de%20ver%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergivIA."
                target="_blank"
                rel="noopener noreferrer"
                className={`${btnBase} w-full min-w-[200px] border border-slate-700 bg-slate-900 text-center text-white hover:bg-slate-800 sm:w-auto`}
              >
                Ver demonstração
              </a>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-slate-800 bg-slate-950 px-4 py-16 sm:px-6 sm:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(20,184,166,0.12),transparent_36%),radial-gradient(circle_at_84%_30%,rgba(14,165,233,0.1),transparent_34%)]" />
          <div className="relative mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-[0_18px_40px_rgba(2,6,23,0.28)] backdrop-blur-sm sm:p-8">
            <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Conteúdo para integradores
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Software para integradores solares: como gerar propostas mais rápido
            </h2>
            <div className="mt-3 h-1 w-28 rounded-full bg-gradient-to-r from-emerald-400 to-sky-400" />
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
                    className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-400/40"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-emerald-400">
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

        {}
        <footer className="border-t border-slate-800 bg-slate-950 px-4 py-12 sm:px-6 text-slate-300">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <Link href="/" className="flex items-center">
                <Image
                  src="/logo-dark.png"
                  alt="EnergiVIA"
                  width={480}
                  height={136}
                  className="h-12 w-auto object-contain sm:h-14"
                />
              </Link>
              <nav className="flex flex-wrap items-center justify-center gap-5 text-sm">
                <a href="#como-funciona" className="hover:text-white transition-colors">
                  Como funciona
                </a>
                <a href="#beneficios" className="hover:text-white transition-colors">
                  Resultados
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
