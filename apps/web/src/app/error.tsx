"use client";

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home, Copy, Check } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error("Root Application Error:", error);
    Sentry.captureException(error);
  }, [error]);

  const handleCopy = () => {
    const info = `Error: ${error?.message || "Desconhecido"}\nDigest: ${error?.digest || "N/A"}`;
    navigator.clipboard.writeText(info).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex min-h-[70vh] flex-1 flex-col items-center justify-center px-4 py-12 text-slate-100">
      <div className="w-full max-w-lg rounded-2xl border border-rose-500/20 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3 text-rose-400 mb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Algo inesperado aconteceu</h2>
            <p className="text-xs text-slate-400">
              Nossa equipe foi notificada e já está investigando
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-xl bg-slate-950/80 border border-slate-800 p-4 font-mono text-xs text-slate-300">
          <p className="font-semibold text-rose-300 mb-1">
            {error?.message || "Ocorreu um erro ao processar a solicitação."}
          </p>
          {error?.digest && (
            <p className="text-[11px] text-slate-500 mt-1">
              Código do erro: <span className="text-slate-400">{error.digest}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-400 active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-800 hover:text-white active:scale-95"
            >
              <Home className="h-4 w-4" />
              Início
            </Link>
          </div>

          {error?.digest && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copiado!" : "Copiar ID"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
