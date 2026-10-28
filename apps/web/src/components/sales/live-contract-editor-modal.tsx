"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  X,
  Save,
  CheckCircle2,
  FileText,
  AlertCircle,
  PlusCircle,
  ExternalLink,
  Loader2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
} from "lucide-react";
import { getSaleDocumentForEditor, updateSaleDocumentContent } from "@/lib/sales-api";
import { PdfViewerModal } from "./pdf-viewer-modal";

interface LiveContractEditorModalProps {
  saleId: string;
  docId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function LiveContractEditorModal({
  saleId,
  docId,
  isOpen,
  onClose,
  onSaved,
}: LiveContractEditorModalProps): JSX.Element | null {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [docData, setDocData] = useState<{
    id: string;
    title: string;
    templateType: string;
    contentHtml: string;
    isSigned: boolean;
    status: string;
    publicToken: string;
  } | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !saleId || !docId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSavedSuccess(false);

    getSaleDocumentForEditor(saleId, docId)
      .then((data) => {
        if (!isMounted) return;
        setDocData(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Erro ao carregar o documento para edição.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, saleId, docId]);

  // Sincronizar o HTML carregado no editor contentEditable (extrai o body limpo)
  useEffect(() => {
    if (editorRef.current && docData?.contentHtml && !loading) {
      const match = docData.contentHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const inner = match ? match[1] : docData.contentHtml;
      editorRef.current.innerHTML = inner;
    }
  }, [docData, loading]);

  // Atalho de teclado Ctrl+S para salvar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!docData?.isSigned && !saving) {
          handleSave();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [docData, saving]);

  if (!isOpen) return null;

  async function handleSave() {
    if (!editorRef.current || !docData || docData.isSigned) return;

    const updatedBody = editorRef.current.innerHTML;
    let fullHtml = updatedBody;
    if (docData.contentHtml && docData.contentHtml.includes("</body>")) {
      fullHtml = docData.contentHtml.replace(
        /(<body[^>]*>)([\s\S]*?)(<\/body>)/i,
        `$1${updatedBody}$3`
      );
    }

    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      await updateSaleDocumentContent(saleId, docId, fullHtml);
      setDocData((prev) => (prev ? { ...prev, contentHtml: fullHtml } : null));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
      onSaved?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar alterações no contrato.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function handleFormat(command: string, value?: string) {
    if (typeof document !== "undefined") {
      document.execCommand(command, false, value);
      editorRef.current?.focus();
    }
  }

  function handleInsertClause() {
    if (!editorRef.current || docData?.isSigned) return;

    // Detectar numeração mais alta entre as cláusulas existentes
    const allTitles = Array.from(editorRef.current.querySelectorAll(".section-title"));
    let nextNum = allTitles.length + 1;
    for (const t of allTitles) {
      const match = t.textContent?.match(/^(\d+)\./);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n >= nextNum) nextNum = n + 1;
      }
    }

    const clauseHtml = `
      <div class="section-title">
        ${nextNum}. DAS CONDIÇÕES COMPLEMENTARES
      </div>
      <p>
        ${nextNum}.1. Fica expressamente estipulado entre as Partes que: [digite aqui as condições acordadas diretamente neste parágrafo].
      </p>
    `;

    const signaturesEl =
      editorRef.current.querySelector(".signatures-wrapper") ||
      editorRef.current.querySelector(".signatures-container") ||
      editorRef.current.querySelector("table:last-of-type");

    if (signaturesEl) {
      signaturesEl.insertAdjacentHTML("beforebegin", clauseHtml);
    } else {
      editorRef.current.insertAdjacentHTML("beforeend", clauseHtml);
    }

    editorRef.current.focus();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      {/* ESTILOS ESPECÍFICOS DO CONTRATO SCOPED PARA A FOLHA A4 */}
      <style>{`
        .contract-editor-sheet .header {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .contract-editor-sheet .header-table {
          display: table;
          width: 100%;
        }
        .contract-editor-sheet .header-row {
          display: table-row;
        }
        .contract-editor-sheet .header-logo-cell {
          display: table-cell;
          vertical-align: middle;
          width: 30%;
          text-align: left;
        }
        .contract-editor-sheet .header-title-cell {
          display: table-cell;
          vertical-align: middle;
          width: 70%;
          text-align: right;
        }
        .contract-editor-sheet .title {
          font-size: 11.5pt;
          font-weight: 800;
          text-transform: uppercase;
          margin: 0 0 4px 0;
          color: #0f172a;
          letter-spacing: -0.2px;
        }
        .contract-editor-sheet .subtitle {
          font-size: 8pt;
          color: #059669;
          font-weight: 600;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .contract-editor-sheet .section-title {
          font-size: 9.5pt;
          font-weight: 700;
          text-transform: uppercase;
          margin-top: 14px;
          margin-bottom: 6px;
          color: #0f172a;
          border-left: 3px solid #059669;
          padding-left: 8px;
        }
        .contract-editor-sheet p, .contract-editor-sheet li {
          text-align: justify;
          margin: 0 0 6px 0;
          font-size: 9pt;
          line-height: 1.45;
          color: #1e293b;
        }
        .contract-editor-sheet ul {
          margin: 4px 0 8px 18px;
          padding: 0;
        }
        .contract-editor-sheet li {
          margin-bottom: 4px;
        }
        .contract-editor-sheet .box {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 12px;
          margin: 8px 0;
        }
        .contract-editor-sheet .grid {
          display: table;
          width: 100%;
        }
        .contract-editor-sheet .row {
          display: table-row;
        }
        .contract-editor-sheet .cell {
          display: table-cell;
          padding: 3px 6px;
          font-size: 8.5pt;
          vertical-align: top;
        }
        .contract-editor-sheet .cell-label {
          font-weight: 600;
          color: #475569;
          width: 28%;
        }
        .contract-editor-sheet table.data-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 8.5pt;
          margin: 8px 0;
          page-break-inside: auto;
          break-inside: auto;
        }
        .contract-editor-sheet table.data-table thead {
          display: table-header-group;
        }
        .contract-editor-sheet table.data-table tbody {
          page-break-inside: auto;
          break-inside: auto;
        }
        .contract-editor-sheet table.data-table tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .contract-editor-sheet table.data-table th, .contract-editor-sheet table.data-table td {
          border-top: 1px solid #cbd5e1;
          border-left: 1px solid #cbd5e1;
          padding: 5px 8px;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          box-sizing: border-box;
        }
        .contract-editor-sheet table.data-table th:last-child, .contract-editor-sheet table.data-table td:last-child {
          border-right: 1px solid #cbd5e1;
        }
        .contract-editor-sheet table.data-table tbody tr:last-child td {
          border-bottom: 1px solid #cbd5e1;
        }
        .contract-editor-sheet table.data-table th {
          background-color: #f1f5f9;
          font-weight: 700;
          color: #0f172a;
          text-align: left;
        }
        .contract-editor-sheet .signatures-wrapper {
          margin-top: 25px;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      `}</style>

      {/* BARRA SUPERIOR DE AÇÕES E FERRAMENTAS DO EDITOR */}
      <header className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Voltar para a tela da venda"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 sm:text-base">
                {docData?.title || "Editor de Minuta Contratual"}
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {docData?.isSigned ? (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Documento Assinado · Modo Somente Leitura
                </span>
              ) : (
                "Edição em tempo real para este cliente · Clique e digite diretamente no texto (Ctrl+S para salvar)"
              )}
            </p>
          </div>
        </div>

        {/* BARRA CENTRAL DE FORMATAÇÃO */}
        {!docData?.isSigned && !loading && (
          <div className="hidden md:flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-850">
            <button
              onClick={() => handleFormat("bold")}
              className="rounded p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 transition"
              title="Negrito (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleFormat("italic")}
              className="rounded p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 transition"
              title="Itálico (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleFormat("underline")}
              className="rounded p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 transition"
              title="Sublinhado (Ctrl+U)"
            >
              <UnderlineIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleFormat("insertUnorderedList")}
              className="rounded p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 transition"
              title="Lista de Marcadores"
            >
              <List className="h-4 w-4" />
            </button>

            <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />

            <button
              onClick={handleInsertClause}
              className="inline-flex items-center gap-1.5 rounded bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition"
              title="Adicionar uma nova cláusula numerada no contrato"
            >
              <PlusCircle className="h-3.5 w-3.5" />+ Nova Cláusula
            </button>
          </div>
        )}

        {/* BOTÕES DE SALVAMENTO E VISUALIZAÇÃO */}
        <div className="flex items-center gap-2">
          {docData?.publicToken && (
            <button
              type="button"
              onClick={() => setShowPdfModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
              title="Visualizar documento em PDF com botão de voltar"
            >
              <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Visualizar PDF</span>
            </button>
          )}

          {!docData?.isSigned && (
            <>
              <button
                type="button"
                onClick={handleInsertClause}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-colors"
                title="Inserir uma nova cláusula no contrato"
              >
                <PlusCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>+ Nova Cláusula</span>
              </button>

              <button
                onClick={handleSave}
                disabled={saving || loading}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold shadow-md transition-all ${
                  savedSuccess
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95"
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : savedSuccess ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Salvo com Sucesso!
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </>
          )}

          <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ÁREA DE ALERTA DE ERRO */}
      {error && (
        <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-6 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ÁREA PRINCIPAL DO CANVAS DO DOCUMENTO (FOLHA A4 SIMULADA) */}
      <main className="flex-1 overflow-y-auto bg-slate-200/70 p-4 sm:p-8 dark:bg-slate-950 flex justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
            <p className="text-sm font-medium">Carregando minuta para edição em tempo real...</p>
          </div>
        ) : (
          <div className="w-full max-w-[850px] flex flex-col gap-4">
            {docData?.isSigned ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300 flex items-center gap-2 shadow-sm">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Documento Oficial Assinado:</strong> As cláusulas possuem autenticidade
                  jurídica e hash probatório registrado, não podendo mais ser alteradas.
                </span>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-600/20 bg-emerald-50/70 p-2.5 text-xs text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-950/30 dark:text-emerald-300 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Você pode clicar e alterar diretamente qualquer texto do documento abaixo, ou
                    clicar em <strong>+ Nova Cláusula</strong> para adicionar condições exclusivas.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleInsertClause}
                    className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />+ Nova Cláusula
                  </button>
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    Atalho: <strong>Ctrl + S</strong>
                  </span>
                </div>
              </div>
            )}

            {/* FOLHA DE PAPEL A4 EDITÁVEL */}
            <div
              className={`min-h-[1123px] h-auto w-full rounded-sm bg-white p-8 sm:p-14 text-slate-900 shadow-2xl transition-all border border-slate-200 dark:border-slate-800 contract-editor-sheet ${
                docData?.isSigned
                  ? "cursor-default select-text"
                  : "focus-within:ring-2 focus-within:ring-emerald-500/40"
              }`}
            >
              <div
                ref={editorRef}
                contentEditable={!docData?.isSigned}
                suppressContentEditableWarning={true}
                className="focus:outline-none font-sans text-[9pt] leading-relaxed selection:bg-emerald-200 selection:text-emerald-950 w-full min-h-[900px] h-auto overflow-visible"
              />
            </div>

            {!docData?.isSigned && (
              <div className="flex justify-center pb-6">
                <button
                  type="button"
                  onClick={handleInsertClause}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-emerald-600/40 bg-white/90 px-6 py-2.5 text-xs font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 hover:border-emerald-600 dark:border-emerald-500/40 dark:bg-slate-900/90 dark:text-emerald-300 dark:hover:bg-slate-800 transition-all"
                >
                  <PlusCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />+ Inserir
                  Nova Cláusula Complementar no Final do Contrato
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL DE VISUALIZAÇÃO DE PDF COM BOTÃO DE VOLTAR */}
      {showPdfModal && docData?.publicToken && (
        <PdfViewerModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          pdfUrl={`/api/proxy/public/documents/${docData.publicToken}/pdf?regenerate=true`}
          title={docData.title || "Visualização da Minuta (PDF)"}
          isSigned={docData.isSigned}
        />
      )}
    </div>
  );
}
