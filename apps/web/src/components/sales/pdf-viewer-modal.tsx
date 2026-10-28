"use client";

import { useEffect } from "react";
import { ArrowLeft, Download, ExternalLink, FileText, ShieldCheck, X } from "lucide-react";

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
  isSigned?: boolean;
}

export function PdfViewerModal({
  isOpen,
  onClose,
  pdfUrl,
  title,
  isSigned,
}: PdfViewerModalProps): JSX.Element | null {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !pdfUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-150">
      {/* CABEÇALHO DO VISUALIZADOR COM BOTÃO DE VOLTAR */}
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          {/* BOTÃO VOLTAR DESTACADO */}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100 hover:border-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
            title="Voltar para a tela da venda"
          >
            <ArrowLeft className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <span>Voltar para a Venda</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-800">
            <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-xs md:max-w-md">
              {title}
            </h2>
            {isSigned ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
                <ShieldCheck className="h-3 w-3" />
                Assinado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                Minuta PDF
              </span>
            )}
          </div>
        </div>

        {/* AÇÕES À DIREITA: BAIXAR, ABRIR EM NOVA ABA E FECHAR */}
        <div className="flex items-center gap-2">
          <a
            href={pdfUrl}
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
            title="Baixar arquivo PDF no computador"
          >
            <Download className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
            <span className="hidden md:inline">Baixar PDF</span>
          </a>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
            title="Abrir em guia externa do navegador"
          >
            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden md:inline">Abrir em Nova Guia</span>
          </a>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Fechar visualizador"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ÁREA DO DOCUMENTO PDF EMBARCADO */}
      <main className="flex-1 bg-slate-900 relative">
        <iframe
          src={pdfUrl}
          className="w-full h-full border-0 bg-slate-900"
          title={`Visualizador - ${title}`}
        />
      </main>
    </div>
  );
}
