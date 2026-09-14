import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Check,
  ArrowRight,
  Lock,
  FileSearch,
  Gauge,
  Workflow,
  FileText,
  BarChart2,
  Laptop,
  Users,
  Zap,
  Shield,
  Clock,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { HowItWorksTabs } from "@/components/landing/how-it-works-tabs";

const appLoginUrl = "/login";
const whatsappDemoUrl =
  "https://wa.me/5544988117969?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergivIA.";

const faqItems = [
  {
    question: "Em quanto tempo consigo gerar a primeira proposta?",
    answer:
      "Após configurar sua conta, você já consegue enviar a conta de luz e gerar a primeira proposta no mesmo dia. O processo completo da análise técnica à proposta executiva leva menos de 2 minutos.",
  },
  {
    question: "Preciso sair do WhatsApp para operar o fluxo comercial?",
    answer:
      "Não. O fluxo foi projetado para operar diretamente no WhatsApp: recebimento da fatura, validação das informações, seleção de kit com sua margem e envio da proposta comercial com link interativo e PDF.",
  },
  {
    question: "A plataforma substitui meu time comercial?",
    answer:
      "Não. A EnergivIA elimina o trabalho braçal de cálculo, conferência e digitação manual para que seus vendedores e consultores foquem no relacionamento, negociação e fechamento de contratos.",
  },
  {
    question: "Posso personalizar as propostas com a identidade da minha integradora?",
    answer:
      "Sim. As propostas são geradas com a sua logomarca, cores da sua empresa, dados de contato, garantias personalizadas e condições de pagamento configuradas por você.",
  },
  {
    question: "Como funciona a precificação e margem dos kits?",
    answer:
      "Você define como opera: com base em custos de distribuidores parceiros ou pelo valor de venda por kWp praticado na sua região, garantindo que suas margens de lucro sejam respeitadas em cada proposta.",
  },
] as const;

export const metadata: Metadata = {
  title: "EnergivIA • Plataforma de Inteligência Comercial para Energia Solar",
  description:
    "A plataforma definitiva para integradores solares gerarem propostas executivas em segundos, dimensionarem kits com precisão e fecharem mais vendas.",
};

export default function HomePage(): JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Luzes de Fundo Ambientais Suaves */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute left-1/2 top-[-100px] h-[550px] w-[950px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="absolute right-[-10%] top-[30%] h-[400px] w-[600px] rounded-full bg-teal-500/5 blur-[150px]" />
        <div className="absolute left-[-10%] top-[60%] h-[450px] w-[600px] rounded-full bg-sky-500/5 blur-[160px]" />
        {/* Grid de pontos de alta precisão */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Barra de Navegação Superior Flutuante Estilo Pílula (Centralizada) */}
      <header className="sticky top-4 sm:top-6 z-50 w-full px-4 sm:px-6">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full border border-white/10 bg-slate-950/80 px-4 sm:px-6 shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all">
          {/* Logotipo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo-dark.png"
              alt="EnergivIA"
              width={480}
              height={136}
              className="h-8 w-auto object-contain sm:h-9"
              priority
              unoptimized
            />
          </Link>

          {/* Links Centrais */}
          <nav className="hidden md:flex items-center gap-1 text-[13px] font-medium text-slate-300">
            <a
              href="#como-funciona"
              className="rounded-full px-3.5 py-1.5 transition-colors hover:bg-white/5 hover:text-white"
            >
              Como Funciona
            </a>
            <a
              href="#beneficios"
              className="rounded-full px-3.5 py-1.5 transition-colors hover:bg-white/5 hover:text-white"
            >
              Resultados
            </a>
            <a
              href="#diferenciais"
              className="rounded-full px-3.5 py-1.5 transition-colors hover:bg-white/5 hover:text-white"
            >
              Diferenciais
            </a>
            <a
              href="#faq"
              className="rounded-full px-3.5 py-1.5 transition-colors hover:bg-white/5 hover:text-white"
            >
              FAQ
            </a>
          </nav>

          {/* Ações Direitas */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={appLoginUrl}
              className="rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold text-slate-300 transition hover:text-white"
            >
              Entrar
            </a>
            <a
              href={appLoginUrl}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-1.5 text-xs sm:text-sm font-bold text-slate-950 shadow-[0_0_20px_-3px_rgba(16,185,129,0.5)] transition hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]"
            >
              Testar Grátis
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center px-4 pt-12 pb-20 sm:px-6 sm:pt-16 md:pt-20">
        <div className="mx-auto w-full max-w-5xl text-center">
          {/* Selo Superior / Eyebrow (Zero emojis, com ícone SVG) */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-emerald-300 backdrop-blur-md shadow-sm">
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span>Plataforma de Inteligência Comercial para Energia Solar</span>
          </div>

          {/* Título Principal H1 */}
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl leading-[1.12]">
            A plataforma definitiva para integradores gerarem{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
              propostas em segundos
            </span>{" "}
            e acelerarem vendas.
          </h1>

          {/* Subtítulo H2 / Parágrafo */}
          <p className="mx-auto mt-6 max-w-3xl text-base font-normal leading-relaxed text-slate-400 sm:text-lg md:text-xl">
            Da análise automática da fatura à proposta executiva: dimensione o sistema ideal,
            selecione kits com margem de lucro e responda seus clientes antes da concorrência.
          </p>

          {/* Botões de Ação Principal */}
          <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row sm:gap-4">
            <a
              href={appLoginUrl}
              className="inline-flex h-12 w-full sm:w-auto min-w-[260px] items-center justify-center rounded-full bg-emerald-500 px-7 text-sm font-bold text-slate-950 shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)] transition hover:bg-emerald-400 hover:-translate-y-0.5"
            >
              Começar teste gratuito de 5 dias
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
            <a
              href={whatsappDemoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full sm:w-auto min-w-[240px] items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 px-7 text-sm font-semibold text-slate-200 backdrop-blur-sm transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
            >
              <FaWhatsapp className="mr-2 h-4 w-4 text-emerald-400" />
              Falar com um especialista
            </a>
          </div>

          {/* Micro-provas e Garantias (Zero Emojis, Ícones SVG) */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs sm:text-sm text-slate-400">
            <p className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-400" />
              Configuração em 2 minutos
            </p>
            <span className="hidden sm:inline text-slate-600">•</span>
            <p className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-400" />
              Propostas com a sua logomarca
            </p>
            <span className="hidden sm:inline text-slate-600">•</span>
            <p className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-400" />
              Suporte dedicado ao integrador
            </p>
          </div>
        </div>

        {/* Demonstração em Vídeo Remotion do Produto (Moldura de Software) */}
        <div className="relative mx-auto mt-12 w-full max-w-5xl">
          {/* Brilho de Iluminação de Fundo */}
          <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-b from-emerald-500/20 via-teal-500/10 to-transparent blur-2xl opacity-60" />

          {/* Janela de Software / Mockup */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b101e] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9),0_0_40px_rgba(16,185,129,0.12)]">
            {/* Barra da Janela */}
            <div className="flex h-10 items-center justify-between border-b border-white/10 bg-[#0d1425] px-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>

              <div className="hidden sm:flex items-center gap-2 rounded-md bg-slate-900/80 border border-white/5 px-3 py-1 text-[11px] text-slate-400 font-mono">
                <Lock className="h-3 w-3 text-emerald-400" />
                <span>energivia.com.br/painel/estudo-solar</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Demonstração Interativa
                </span>
              </div>
            </div>

            {/* Vídeo Remotion de Alta Resolução */}
            <div className="relative aspect-video w-full bg-[#070b14]">
              <video
                src="/landing/product-demo.mp4"
                poster="/landing/product-demo-poster.jpg"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo Principal */}
      <main className="relative z-10 flex-1">
        {/* Seção Como Funciona */}
        <HowItWorksTabs />

        {/* Seção Prova Social & Resultados Reais */}
        <section
          id="beneficios"
          className="relative overflow-hidden border-y border-white/5 bg-[#080d1a] px-4 py-20 sm:px-6 sm:py-24"
        >
          <div className="relative mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                Resultados Mensuráveis
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Impacto real na operação de integradores solares
              </h2>
              <p className="mt-4 text-base text-slate-400">
                Acelere o tempo de resposta, padronize suas entregas e aumente a taxa de conversão
                com um fluxo comercial ágil e previsível.
              </p>
            </div>

            {/* Grid de Métricas */}
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { value: "< 2 min", label: "Para gerar uma proposta completa", icon: Clock },
                { value: "100%", label: "Padronizada com a marca da sua empresa", icon: Shield },
                {
                  value: "1 único fluxo",
                  label: "Da conta de luz ao envio no WhatsApp",
                  icon: Workflow,
                },
                {
                  value: "No mesmo dia",
                  label: "Primeira proposta gerada após o cadastro",
                  icon: Zap,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.label}
                    className="rounded-2xl border border-white/5 bg-slate-900/50 p-6 text-center shadow-lg backdrop-blur-sm transition-all hover:border-emerald-500/30 hover:-translate-y-1"
                  >
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mb-3">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-2xl font-bold text-white sm:text-3xl tracking-tight">
                      {item.value}
                    </p>
                    <p className="mt-2 text-sm text-slate-400 leading-snug">{item.label}</p>
                  </article>
                );
              })}
            </div>

            {/* Depoimento Real */}
            <figure className="mt-10 rounded-2xl border border-white/5 bg-slate-900/40 p-8 text-center backdrop-blur-sm shadow-xl">
              <blockquote className="text-base text-slate-200 sm:text-lg font-medium leading-relaxed">
                "Antes perdíamos horas montando propostas e planilhas para cada cliente. Com a
                EnergivIA, enviamos propostas técnicas e comerciais em minutos direto no WhatsApp.
                Nossa taxa de fechamento subiu significativamente."
              </blockquote>
              <figcaption className="mt-4 text-sm font-semibold text-emerald-400">
                Integrador Solar • Operação Comercial em São Paulo
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Seção Diferenciais Técnicos */}
        <section
          id="diferenciais"
          className="relative overflow-hidden border-t border-white/5 bg-[#060913] px-4 py-20 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                <Gauge className="h-3.5 w-3.5 text-emerald-400" />
                Diferenciais Estratégicos
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Tecnologia desenhada para a rotina do integrador
              </h2>
              <p className="mt-4 text-base text-slate-400">
                Uma solução robusta e pensada para quem precisa de agilidade na rua, precisão
                técnica e controle comercial.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: FaWhatsapp,
                  title: "Operação Direta no WhatsApp",
                  description:
                    "Receba faturas, confirme os parâmetros do sistema e despache a proposta executiva no canal em que seu cliente responde mais rápido.",
                },
                {
                  icon: FileSearch,
                  title: "Leitura Automatizada de Faturas",
                  description:
                    "Extração precisa de consumo histórico, concessionária, tarifas com impostos e grupo tarifário sem necessidade de digitação manual.",
                },
                {
                  icon: Gauge,
                  title: "Dimensionamento e Margem Flexível",
                  description:
                    "Cálculo instantâneo de potência em kWp, seleção de módulos e inversores com opção de precificação por kit ou venda por kWp na sua região.",
                },
                {
                  icon: Workflow,
                  title: "Gestão Comercial Integrada",
                  description:
                    "Pipeline de negociações organizado com histórico de propostas, status de visualização pelo cliente e lembretes de follow-up.",
                },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className={[
                      "group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-6 transition-all duration-300 hover:border-emerald-500/30 hover:-translate-y-1",
                      index === 0 || index === 3 ? "md:col-span-2" : "",
                    ].join(" ")}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition-transform group-hover:scale-105">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-white tracking-tight">
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

        {/* Seção FAQ */}
        <section
          id="faq"
          className="relative overflow-hidden border-t border-white/5 bg-[#080d1a] px-4 py-20 sm:px-6 sm:py-24"
        >
          <div className="relative mx-auto max-w-4xl">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                FAQ
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Perguntas Frequentes
              </h2>
              <p className="mt-4 text-base text-slate-400">
                Tire suas dúvidas sobre o funcionamento da plataforma e como começar.
              </p>
            </div>

            <div className="mt-10 space-y-3">
              {faqItems.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-xl border border-white/5 bg-slate-900/40 px-5 py-4 transition-all hover:border-emerald-500/30"
                >
                  <summary className="flex cursor-pointer items-center justify-between text-left text-base font-semibold text-white marker:content-none">
                    <span>{item.question}</span>
                    <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Seção de Chamada para Ação Final */}
        <section className="relative overflow-hidden border-t border-white/5 bg-[#060913] px-4 py-20 sm:px-6 sm:py-24">
          <div className="relative z-10 mx-auto max-w-4xl rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-8 text-center shadow-2xl backdrop-blur-md sm:p-12">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              Comece Hoje
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Pronto para transformar a velocidade das suas vendas solares?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400">
              Crie sua conta em menos de 2 minutos e experimente o fluxo de propostas ágeis que
              conquistam clientes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href={appLoginUrl}
                className="inline-flex h-12 w-full sm:w-auto min-w-[220px] items-center justify-center rounded-full bg-emerald-500 px-7 text-sm font-bold text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.4)] transition hover:bg-emerald-400 hover:-translate-y-0.5"
              >
                Criar conta gratuita
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
              <a
                href={whatsappDemoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-full sm:w-auto min-w-[220px] items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 px-7 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
              >
                <FaWhatsapp className="mr-2 h-4 w-4 text-emerald-400" />
                Agendar demonstração
              </a>
            </div>
          </div>
        </section>

        {/* Artigos e Links Internos de SEO */}
        <section className="relative overflow-hidden border-t border-white/5 bg-[#050810] px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-6">
              Recursos e Artigos para Integradores
            </p>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {[
                {
                  href: "/proposta-energia-solar",
                  title: "Proposta de energia solar",
                  description: "Como reduzir tempo de entrega mantendo padrão técnico.",
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
                  description: "Critérios para escolher a plataforma ideal para sua empresa.",
                  icon: Laptop,
                },
                {
                  href: "/crm-energia-solar",
                  title: "CRM para energia solar",
                  description: "Como organizar seu funil e melhorar o follow-up de clientes.",
                  icon: Users,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col gap-2 rounded-xl border border-white/5 bg-slate-900/30 p-4 transition-all hover:border-emerald-500/30 hover:-translate-y-0.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-400 leading-snug">{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Rodapé Corporativo */}
        <footer className="border-t border-white/5 bg-[#04060c] px-4 py-12 sm:px-6 text-slate-400">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <Link href="/" className="flex items-center">
                <Image
                  src="/logo-dark.png"
                  alt="EnergivIA"
                  width={480}
                  height={136}
                  className="h-9 w-auto object-contain"
                  unoptimized
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
                  href={whatsappDemoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Demonstração
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
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t border-white/5 pt-6 text-xs text-slate-400 gap-2">
              <p>
                © {new Date().getFullYear()} EnergivIA. Inteligência comercial para o integrador
                solar. CNPJ: 66.304.358/0001-16
              </p>
              <p className="text-slate-400">Desenvolvido para integradores de alta performance.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
