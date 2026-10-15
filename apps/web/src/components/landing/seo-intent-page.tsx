import Link from "next/link";
import { Sparkles, CheckCircle2, Zap, ChevronDown } from "lucide-react";
import { LandingSubpageHeader } from "@/components/landing/landing-subpage-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { buildFaqPageSchema, buildWebPageSchema, JsonLd } from "@/lib/seo/structured-data";

type SeoFaq = {
  question: string;
  answer: string;
};

type SeoIntentPageProps = {
  pathname?: string;
  eyebrow: string;
  title: string;
  description: string;
  problemTitle: string;
  problemParagraphs: string[];
  flowTitle: string;
  flowSteps: string[];
  examplesTitle: string;
  examples: { title: string; description: string }[];
  comparisonTitle: string;
  comparisonRows: { topic: string; manual: string; energivia: string }[];
  faqTitle: string;
  faqItems: SeoFaq[];
  ctaTitle: string;
  ctaDescription: string;
};

const appSignupUrl = "/cadastro";

export function SeoIntentPage({
  pathname,
  eyebrow,
  title,
  description,
  problemTitle,
  problemParagraphs,
  flowTitle,
  flowSteps,
  examplesTitle,
  examples,
  comparisonTitle,
  comparisonRows,
  faqTitle,
  faqItems,
  ctaTitle,
  ctaDescription,
}: SeoIntentPageProps): JSX.Element {
  const sectionTitleClass =
    "text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400";

  const baseUrl = (process.env["NEXT_PUBLIC_APP_URL"] || "https://energivia.com.br").replace(
    /\/$/,
    ""
  );

  const schemas: Record<string, unknown>[] = [buildFaqPageSchema(faqItems)];
  if (pathname) {
    schemas.push(
      buildWebPageSchema({
        url: pathname,
        title,
        description,
        baseUrl,
      })
    );
  }

  const structuredData =
    schemas.length === 1
      ? schemas[0]!
      : {
          "@context": "https://schema.org",
          "@graph": schemas,
        };

  return (
    <div
      className="landing-page dark min-h-screen flex flex-col bg-[#02040a] text-white antialiased font-plus-jakarta selection:bg-[#10b981]/30 selection:text-white"
      style={{ colorScheme: "dark" }}
    >
      <JsonLd data={structuredData} />
      {/* Ambient background lighting */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[200px] left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12),transparent_70%)] blur-3xl" />
        <div className="absolute top-[800px] -right-[150px] h-[500px] w-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.08),transparent_70%)] blur-3xl" />
      </div>

      <LandingSubpageHeader />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14 space-y-10 sm:space-y-12">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-[32px] glass-panel p-7 sm:p-10 shadow-2xl">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full glass-pill border-emerald-500/30 bg-emerald-950/30 px-3.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              {eyebrow}
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-[2.6rem] md:leading-[1.15]">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg font-light">
              {description}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                "Menos tempo entre lead e proposta",
                "Operação comercial com padrão",
                "Execução integrada ao WhatsApp",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 rounded-2xl glass-card px-4 py-3 text-sm font-medium text-slate-200 border-white/10"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Diagnóstico do Cenário */}
        <section className="rounded-3xl glass-card p-7 sm:p-9 border-white/10">
          <p className={sectionTitleClass}>Diagnóstico do cenário</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            {problemTitle}
          </h2>
          <div className="mt-5 space-y-4 text-sm sm:text-base leading-relaxed text-slate-300 font-light">
            {problemParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        {/* Fluxo Recomendado */}
        <section className="rounded-3xl glass-card p-7 sm:p-9 border-white/10">
          <p className={sectionTitleClass}>Fluxo recomendado</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            {flowTitle}
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {flowSteps.map((step, index) => (
              <li
                key={step}
                className="relative overflow-hidden rounded-2xl glass-card glass-card-hover p-5 border-white/10"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Passo {index + 1}
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-bold border border-emerald-500/20">
                    {index + 1}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-300 font-light">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Aplicações Práticas */}
        <section className="rounded-3xl glass-card p-7 sm:p-9 border-white/10">
          <p className={sectionTitleClass}>Aplicações práticas</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            {examplesTitle}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {examples.map((example) => (
              <article
                key={example.title}
                className="rounded-2xl glass-card glass-card-hover p-5 border-white/10"
              >
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
                  {example.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400 font-light">
                  {example.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Comparativo Operacional */}
        <section className="rounded-3xl glass-card p-7 sm:p-9 border-white/10">
          <p className={sectionTitleClass}>Comparativo operacional</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            {comparisonTitle}
          </h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-[#02040a]/40">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.04] border-b border-white/10">
                <tr>
                  <th className="px-5 py-3.5 font-semibold text-white">Critério</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-400">Processo manual</th>
                  <th className="px-5 py-3.5 font-semibold text-emerald-300 bg-emerald-950/20">
                    Com EnergivIA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-light">
                {comparisonRows.map((row) => (
                  <tr key={row.topic} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-200">{row.topic}</td>
                    <td className="px-5 py-3.5 text-slate-400">{row.manual}</td>
                    <td className="px-5 py-3.5 font-medium text-emerald-300 bg-emerald-950/20">
                      {row.energivia}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Perguntas Frequentes (FAQ) */}
        <section className="rounded-3xl glass-card p-7 sm:p-9 border-white/10">
          <p className={sectionTitleClass}>Perguntas frequentes</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            {faqTitle}
          </h2>
          <div className="mt-6 space-y-3">
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl glass-card p-5 border-white/10 transition-all hover:border-emerald-500/30"
              >
                <summary className="cursor-pointer list-none font-semibold text-white flex items-center justify-between gap-4">
                  <span>{item.question}</span>
                  <ChevronDown className="h-5 w-5 text-slate-400 transition-transform duration-200 group-open:rotate-180 shrink-0 text-emerald-400" />
                </summary>
                <p className="mt-3.5 pt-3.5 border-t border-white/5 text-sm leading-relaxed text-slate-300 font-light">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA Final */}
        <section className="relative overflow-hidden rounded-[32px] glass-panel p-8 sm:p-12 border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-[#02040a]/90 to-[#02040a]">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{ctaTitle}</h2>
            <p className="mt-3 text-base text-slate-300 font-light leading-relaxed">
              {ctaDescription}
            </p>
            <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
              <Link
                href={appSignupUrl}
                className="inline-flex h-12 items-center justify-center rounded-full glass-pill border-emerald-500/50 bg-emerald-500 px-7 text-sm font-semibold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-[0_0_25px_rgba(16,185,129,0.35)]"
              >
                Criar conta gratuitamente
              </Link>
              <a
                href="https://wa.me/5544988117969?text=Ol%C3%A1!%20Quero%20ver%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergivIA."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-full glass-pill border-white/15 bg-white/5 px-7 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10"
              >
                Ver demonstração no WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
