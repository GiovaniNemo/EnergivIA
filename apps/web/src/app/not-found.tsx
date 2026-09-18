import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Home, Sparkles } from "lucide-react";

export default function NotFound(): JSX.Element {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-16 text-slate-100 sm:px-6">
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[450px] w-[750px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/10 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(20,184,166,0.08),transparent_60%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
        {/* Logo */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 transition-opacity hover:opacity-90"
        >
          <Image
            src="/logo.png"
            alt="EnergivIA"
            width={240}
            height={68}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        {/* 404 Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-teal-300">
          <Sparkles className="h-3.5 w-3.5 text-teal-400" />
          <span>ERRO 404 • PÁGINA NÃO ENCONTRADA</span>
        </div>

        {/* Big Code */}
        <h1 className="mb-4 text-7xl font-extrabold tracking-tight text-white sm:text-8xl">
          <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
            404
          </span>
        </h1>

        {/* Message */}
        <h2 className="mb-3 text-xl font-bold text-slate-100 sm:text-2xl">
          Ops! Não encontramos essa página
        </h2>
        <p className="mb-8 text-sm leading-relaxed text-slate-400 sm:text-base">
          O link que você tentou acessar pode ter sido movido, alterado ou não está mais disponível.
          Verifique o endereço ou retorne com segurança.
        </p>

        {/* Action Buttons */}
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:from-teal-400 hover:to-emerald-500 hover:shadow-teal-500/30 active:scale-[0.98]"
          >
            <Home className="h-4 w-4" />
            Voltar para o Início
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 px-6 py-3.5 text-sm font-semibold text-slate-200 backdrop-blur transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4" />
            Acessar Plataforma
          </Link>
        </div>

        {/* Help footer */}
        <div className="mt-12 border-t border-slate-800/80 pt-6 text-xs text-slate-500">
          Precisa de suporte?{" "}
          <a
            href="mailto:contato@energivia.com.br"
            className="font-medium text-teal-400 underline-offset-4 hover:underline"
          >
            Fale com a nossa equipe
          </a>
        </div>
      </div>
    </main>
  );
}
