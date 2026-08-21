"use client";

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, Copy, Check, RefreshCw, LogOut } from "lucide-react";

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error("Authenticated Layout Error:", error);
    Sentry.captureException(error);
  }, [error]);

  const errorDetails = `${error?.name || "Error"}: ${error?.message || "Erro desconhecido"}\nDigest: ${error?.digest || "N/A"}\n\nStack:\n${error?.stack || "Sem stack trace"}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(errorDetails).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 py-8 text-white">
      <div className="w-full max-w-xl rounded-2xl border border-red-900/50 bg-gray-900/90 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
        <div className="flex items-center gap-3 text-red-500 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Ocorreu um erro no painel</h2>
            <p className="text-xs text-gray-400">Não foi possível carregar a interface</p>
          </div>
        </div>

        <div className="mb-6 rounded-xl bg-black/60 border border-gray-800 p-4 font-mono text-xs text-red-400 overflow-x-auto max-h-48">
          <p className="font-semibold text-red-300 mb-1">{error?.message || "Erro desconhecido"}</p>
          {error?.digest ? <p className="text-[11px] text-gray-500">ID: {error.digest}</p> : null}
          {error?.stack ? (
            <pre className="mt-2 text-[10px] text-gray-400 whitespace-pre-wrap">{error.stack}</pre>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm font-medium text-gray-300 transition-all hover:bg-gray-700 active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar erro
                </>
              )}
            </button>
          </div>

          <a
            href="/auth/logout"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair e relogar
          </a>
        </div>
      </div>
    </div>
  );
}
