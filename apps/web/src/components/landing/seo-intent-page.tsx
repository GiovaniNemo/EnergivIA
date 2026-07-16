import Link from "next/link";
import Image from "next/image";

type SeoFaq = {
  question: string;
  answer: string;
};

type SeoIntentPageProps = {
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

const appLoginUrl = "/auth/login";

export function SeoIntentPage({
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
    "text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700/90";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#edf5f5_0%,#f8fafc_28%,#f8fafc_100%)] text-slate-900">
      <div className="relative overflow-hidden border-b border-slate-200/80 bg-[#edf5f5]">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[280px] w-[640px] -translate-x-1/2 rounded-full bg-teal-400/18 blur-[110px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(20,184,166,0.1),transparent_52%)]" />
        <header className="relative z-10">
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
            <nav className="hidden items-center gap-1 text-sm text-slate-700 sm:flex">
              <Link
                href="/"
                className="inline-flex h-9 items-center justify-center rounded-full px-4 font-medium transition-colors hover:bg-slate-200/70 hover:text-slate-900"
              >
                Home
              </Link>
              <span className="text-slate-400" aria-hidden>
                •
              </span>
              <Link
                href={appLoginUrl}
                className="inline-flex h-9 items-center justify-center rounded-full border border-slate-300 bg-white/80 px-4 font-semibold text-slate-800 transition-colors hover:bg-white"
              >
                Entrar
              </Link>
            </nav>
          </div>
        </header>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:space-y-10 sm:px-6 sm:py-14">
        <section className="relative overflow-hidden rounded-[30px] border border-slate-200/90 bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_60%,#ecfdf5_100%)] p-6 shadow-[0_24px_56px_rgba(15,23,42,0.12)] sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-12 h-56 w-56 rounded-full bg-sky-300/16 blur-3xl" />
          <div className="relative">
            <div className="max-w-4xl">
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                {eyebrow}
              </span>
              <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-slate-900 sm:text-[2.15rem] sm:leading-[1.15]">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
                {description}
              </p>
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {[
                "Menos tempo entre lead e proposta",
                "Operação comercial com padrão",
                "Execução integrada ao WhatsApp",
              ].map((item) => (
                <p
                  key={item}
                  className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.05)]"
                >
                  {item}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-8">
          <p className={sectionTitleClass}>Diagnóstico do cenário</p>
          <h2 className="text-2xl font-semibold text-slate-900">{problemTitle}</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600 sm:text-base">
            {problemParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-8">
          <p className={sectionTitleClass}>Fluxo recomendado</p>
          <h2 className="text-2xl font-semibold text-slate-900">{flowTitle}</h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {flowSteps.map((step, index) => (
              <li
                key={step}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Passo {index + 1}
                </p>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-8">
          <p className={sectionTitleClass}>Aplicações práticas</p>
          <h2 className="text-2xl font-semibold text-slate-900">{examplesTitle}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {examples.map((example) => (
              <article
                key={example.title}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
              >
                <h3 className="text-base font-semibold text-slate-900">{example.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{example.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-8">
          <p className={sectionTitleClass}>Comparativo operacional</p>
          <h2 className="text-2xl font-semibold text-slate-900">{comparisonTitle}</h2>
          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-900">Critério</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Processo manual</th>
                  <th className="px-4 py-3 font-semibold text-emerald-700">Com EnergivIA</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.topic} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-900">{row.topic}</td>
                    <td className="px-4 py-3 text-slate-600">{row.manual}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.energivia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-8">
          <p className={sectionTitleClass}>Perguntas frequentes</p>
          <h2 className="text-2xl font-semibold text-slate-900">{faqTitle}</h2>
          <div className="mt-5 space-y-3">
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-emerald-200 hover:bg-white"
              >
                <summary className="cursor-pointer list-none font-semibold text-slate-900">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-[0_18px_40px_rgba(2,6,23,0.3)] sm:p-8">
          <h2 className="text-2xl font-semibold text-white">{ctaTitle}</h2>
          <p className="mt-3 max-w-3xl text-slate-300">{ctaDescription}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={appLoginUrl}
              className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-emerald-300"
            >
              Criar conta
            </Link>
            <a
              href="https://wa.me/5544988117969?text=Ol%C3%A1!%20Quero%20ver%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergivIA."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-6 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Ver demonstração
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
