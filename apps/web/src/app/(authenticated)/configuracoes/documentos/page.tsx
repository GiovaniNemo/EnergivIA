"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  FileCheck2,
  Sparkles,
  Save,
  RotateCcw,
  Copy,
  Check,
  Search,
  AlertCircle,
  Info,
  PlusCircle,
  Scissors,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  getGlobalDocumentTemplates,
  updateGlobalDocumentTemplate,
  resetGlobalDocumentTemplate,
  type GlobalDocumentTemplatesResponse,
} from "@/lib/sales-api";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DocumentTemplatesSettingsPage(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"CONTRATO_PF" | "PROCURACAO_PF">("CONTRATO_PF");
  const [showVariablesDrawer, setShowVariablesDrawer] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [varSearchQuery, setVarSearchQuery] = useState("");

  const [templatesData, setTemplatesData] = useState<GlobalDocumentTemplatesResponse | null>(null);
  const [contentMap, setContentMap] = useState<Record<string, string>>({
    CONTRATO_PF: "",
    PROCURACAO_PF: "",
  });
  const [isCustomMap, setIsCustomMap] = useState<Record<string, boolean>>({
    CONTRATO_PF: false,
    PROCURACAO_PF: false,
  });

  const editorRef = useRef<HTMLDivElement>(null);

  // Carregar templates globais do backend
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getGlobalDocumentTemplates()
      .then((data) => {
        if (!isMounted) return;
        setTemplatesData(data);
        setContentMap({
          CONTRATO_PF: data.templates.CONTRATO_PF.contentHtml,
          PROCURACAO_PF: data.templates.PROCURACAO_PF.contentHtml,
        });
        setIsCustomMap({
          CONTRATO_PF: data.templates.CONTRATO_PF.isCustom,
          PROCURACAO_PF: data.templates.PROCURACAO_PF.isCustom,
        });
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Erro ao carregar modelos globais de documentos.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sincronizar o HTML no editor visual quando a aba ativa muda ou carrega
  useEffect(() => {
    if (editorRef.current && contentMap[activeTab] && !loading) {
      const raw = contentMap[activeTab];
      const match = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      let inner = match ? match[1] : raw;
      inner = inner.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<head[\s\S]*?<\/head>/gi, "");
      editorRef.current.innerHTML = inner;
    }
  }, [activeTab, loading]);

  // Atalho de teclado Ctrl+S para salvar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving) {
          handleSave();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, contentMap, saving]);

  function switchTab(nextTab: "CONTRATO_PF" | "PROCURACAO_PF") {
    if (nextTab === activeTab) return;
    if (editorRef.current) {
      setContentMap((prev) => ({
        ...prev,
        [activeTab]: editorRef.current?.innerHTML || prev[activeTab],
      }));
    }
    setActiveTab(nextTab);
  }

  async function handleSave() {
    if (!editorRef.current) return;
    const currentBody = editorRef.current.innerHTML;

    let fullHtml = currentBody;
    const original = contentMap[activeTab];
    if (original && original.includes("</body>")) {
      fullHtml = original.replace(/(<body[^>]*>)([\s\S]*?)(<\/body>)/i, `$1${currentBody}$3`);
    } else {
      fullHtml = `<!DOCTYPE html>\n<html lang="pt-BR">\n<head><meta charset="UTF-8"></head>\n<body>${currentBody}</body>\n</html>`;
    }

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await updateGlobalDocumentTemplate(activeTab, fullHtml);
      setContentMap((prev) => ({ ...prev, [activeTab]: fullHtml }));
      setIsCustomMap((prev) => ({ ...prev, [activeTab]: true }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar modelo global.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetToFactory() {
    setResetting(true);
    setError(null);
    try {
      const res = await resetGlobalDocumentTemplate(activeTab);
      setContentMap((prev) => ({ ...prev, [activeTab]: res.contentHtml }));
      setIsCustomMap((prev) => ({ ...prev, [activeTab]: false }));

      if (editorRef.current) {
        const match = res.contentHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        let inner = match ? match[1] : res.contentHtml;
        inner = inner
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<head[\s\S]*?<\/head>/gi, "");
        editorRef.current.innerHTML = inner;
      }

      setShowResetConfirm(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao restaurar padrão de fábrica.";
      setError(msg);
    } finally {
      setResetting(false);
    }
  }

  function handleFormat(command: string, value?: string) {
    if (typeof document !== "undefined") {
      document.execCommand(command, false, value);
      editorRef.current?.focus();
    }
  }

  function handleInsertPageBreak() {
    if (!editorRef.current) return;
    document.execCommand(
      "insertHTML",
      false,
      '<div class="page-break" contenteditable="false"></div><p><br></p>'
    );
    editorRef.current.focus();
  }

  function handleInsertClause() {
    if (!editorRef.current) return;
    const clauseHtml = `
      <div class="section-title">CLÁUSULA NOVA - TÍTULO DA DISPOSIÇÃO</div>
      <p>Descreva aqui as condições, direitos, deveres ou especificações operacionais ajustadas entre as partes.</p>
    `;
    document.execCommand("insertHTML", false, clauseHtml);
    editorRef.current.focus();
  }

  function handleCopyVariable(tagKey: string) {
    const formatted = `{{${tagKey}}}`;
    navigator.clipboard.writeText(formatted);
    setCopiedKey(tagKey);
    setTimeout(() => setCopiedKey(null), 2500);
  }

  const availableVariables = templatesData?.availableVariables || [];
  const filteredVariables = availableVariables.filter(
    (v) =>
      v.key.toLowerCase().includes(varSearchQuery.toLowerCase()) ||
      v.label.toLowerCase().includes(varSearchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(varSearchQuery.toLowerCase()) ||
      v.category.toLowerCase().includes(varSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Cabeçalho de Navegação e Título */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-muted-foreground)]">
            <Link
              href="/configuracoes"
              className="inline-flex items-center gap-1 hover:text-[var(--color-foreground)] transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Configurações</span>
            </Link>
            <span>/</span>
            <span className="text-[var(--color-foreground)] font-semibold">
              Minutas & Contratos
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] flex items-center gap-2">
            <FileText className="h-6 w-6 text-[var(--color-primary)]" />
            Modelos de Contratos & Documentos
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-3xl">
            Edite e personalize o modelo padrão oficial da sua integradora. Todas as alterações
            salvas aqui serão aplicadas automaticamente aos{" "}
            <strong>novos contratos e procurações</strong> gerados para os seus futuros clientes.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowVariablesDrawer(true)}
            className="gap-2 border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-accent)] text-xs h-9"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Variáveis Dinâmicas</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowResetConfirm(true)}
            disabled={saving || resetting || !isCustomMap[activeTab]}
            className="gap-2 border-[var(--color-border)] text-xs h-9 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 disabled:opacity-40"
            title={
              isCustomMap[activeTab]
                ? "Restaurar o modelo original de fábrica da EnergivIA"
                : "Este documento já está utilizando o padrão de fábrica da plataforma"
            }
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restaurar Padrão</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
            className="gap-2 bg-[var(--color-primary)] text-white hover:opacity-95 text-xs h-9 px-4 font-semibold shadow-sm"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-3.5 w-3.5 text-white" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>
              {saving ? "Salvando..." : saveSuccess ? "Modelo Salvo!" : "Salvar Modelo Global"}
            </span>
          </Button>
        </div>
      </div>

      {/* Alertas de Sucesso / Erro */}
      {saveSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-medium">
            <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              Modelo padrão global atualizado com sucesso! Novos contratos e procurações gerados na
              plataforma utilizarão esta versão.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccess(false)}
            className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs sm:text-sm text-red-800 dark:text-red-300 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900 dark:text-red-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Abas de Seleção de Documento */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
        <div className="inline-flex rounded-xl bg-[var(--color-background)] p-1 border border-[var(--color-border)] shadow-sm">
          <button
            type="button"
            onClick={() => switchTab("CONTRATO_PF")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === "CONTRATO_PF"
                ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm border border-[var(--color-border)]"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <FileText className="h-4 w-4 text-[var(--color-primary)]" />
            <span>Contrato de Venda Solar</span>
            <span
              className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isCustomMap.CONTRATO_PF
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                  : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
              }`}
            >
              {isCustomMap.CONTRATO_PF ? "Personalizado" : "Padrão de Fábrica"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("PROCURACAO_PF")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === "PROCURACAO_PF"
                ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm border border-[var(--color-border)]"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <FileCheck2 className="h-4 w-4 text-[var(--color-primary)]" />
            <span>Procuração de Homologação ANEEL</span>
            <span
              className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isCustomMap.PROCURACAO_PF
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                  : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
              }`}
            >
              {isCustomMap.PROCURACAO_PF ? "Personalizado" : "Padrão de Fábrica"}
            </span>
          </button>
        </div>

        {/* Status e Dica do Modelo */}
        <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
          <Info className="h-3.5 w-3.5 text-blue-500" />
          <span>
            {activeTab === "CONTRATO_PF"
              ? "Válido para vendas Pessoa Física e Jurídica (qualificação automática)."
              : "Termo de outorga para representação junto à concessionária de energia."}
          </span>
        </div>
      </div>

      {/* Container Unificado do Editor: Barra Fixa no Topo e Canvas de Rolagem */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-md overflow-hidden flex flex-col">
        {/* Barra de Ferramentas Fixa no Topo do Editor */}
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md px-3 sm:px-4 py-2.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              title="Negrito (Ctrl+B)"
              onClick={() => handleFormat("bold")}
              className="rounded p-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Itálico (Ctrl+I)"
              onClick={() => handleFormat("italic")}
              className="rounded p-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Sublinhado (Ctrl+U)"
              onClick={() => handleFormat("underline")}
              className="rounded p-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition"
            >
              <UnderlineIcon className="h-4 w-4" />
            </button>

            <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1" />

            <button
              type="button"
              title="Lista com Marcadores"
              onClick={() => handleFormat("insertUnorderedList")}
              className="rounded p-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition"
            >
              <List className="h-4 w-4" />
            </button>

            <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1" />

            <button
              type="button"
              onClick={handleInsertClause}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 transition"
            >
              <PlusCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>+ Nova Cláusula</span>
            </button>

            <button
              type="button"
              onClick={handleInsertPageBreak}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
            >
              <Scissors className="h-3.5 w-3.5 text-slate-500" />
              <span>Quebra de Página A4</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--color-muted-foreground)] hidden lg:inline">
              Dica: use <strong>Ctrl+S</strong> para salvar a qualquer momento.
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowVariablesDrawer(true)}
              className="text-xs h-8 gap-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Ver Tags Dinâmicas</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving || loading}
              className="h-8 gap-1.5 bg-[var(--color-primary)] text-white hover:opacity-95 text-xs px-3 font-semibold shadow-sm"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saveSuccess ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{saving ? "Salvando..." : saveSuccess ? "Salvo!" : "Salvar"}</span>
            </Button>
          </div>
        </div>

        {/* Área da Folha A4 de Edição com Rolagem Interna Dedicada */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-3 bg-[var(--color-card)] min-h-[450px]">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Carregando modelo oficial da empresa...
            </p>
          </div>
        ) : (
          <div className="flex justify-center bg-slate-100 dark:bg-slate-950/60 p-4 sm:p-8 overflow-y-auto overflow-x-auto max-h-[calc(100vh-230px)] min-h-[640px]">
            <style>{`
            .contract-editor-sheet {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 9.5pt;
              line-height: 1.45;
              color: #1e293b;
              background-color: #ffffff !important;
            }
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
            }
            .contract-editor-sheet table.data-table th, .contract-editor-sheet table.data-table td {
              border-top: 1px solid #cbd5e1;
              border-left: 1px solid #cbd5e1;
              padding: 5px 8px;
              background-color: #ffffff;
            }
            .contract-editor-sheet table.data-table th:last-child, .contract-editor-sheet table.data-table td:last-child {
              border-right: 1px solid #cbd5e1;
            }
            .contract-editor-sheet table.data-table tbody tr:last-child td {
              border-bottom: 1px solid #cbd5e1;
            }
            .contract-editor-sheet table.data-table th {
              background-color: #f1f5f9 !important;
              font-weight: 700;
              color: #0f172a;
              text-align: left;
            }
            .contract-editor-sheet .page-break {
              display: block;
              margin: 28px -36px;
              padding: 10px 0;
              border: none;
              border-top: 2px dashed #94a3b8;
              position: relative;
              text-align: center;
              background: #f8fafc;
              clear: both;
              user-select: none;
            }
            .contract-editor-sheet .page-break::after {
              content: "✂ QUEBRA DE PÁGINA A4 (INÍCIO DA PRÓXIMA FOLHA)";
              display: inline-block;
              background: #0f172a;
              color: #ffffff;
              font-size: 8px;
              font-weight: 700;
              padding: 2px 10px;
              border-radius: 999px;
              letter-spacing: 0.5px;
            }
          `}</style>

            <div className="w-full max-w-[850px] min-h-[1100px] bg-white rounded-lg shadow-xl border border-slate-300 p-8 sm:p-12 contract-editor-sheet my-2">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="outline-none min-h-[950px] focus:ring-1 focus:ring-emerald-500/20 rounded p-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Card Explicativo de Escopo */}
      <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-semibold text-sm">
            <ShieldCheck className="h-4 w-4" />
            <span>Como funciona a substituição das tags dinâmicas?</span>
          </div>
          <CardDescription className="text-xs leading-relaxed">
            As tags entre chaves duplas (ex:{" "}
            <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px] font-mono">
              &#123;&#123;nome_cliente&#125;&#125;
            </code>
            ,{" "}
            <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px] font-mono">
              &#123;&#123;valor_total&#125;&#125;
            </code>
            ) são substituídas automaticamente pelos dados reais da venda no momento da emissão.
            Você pode adicionar novas cláusulas, alterar redações jurídicas ou remover seções
            livremente.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Modal / Gaveta de Variáveis Dinâmicas Disponíveis */}
      {showVariablesDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="h-full w-full max-w-md bg-[var(--color-card)] border-l border-[var(--color-border)] shadow-2xl flex flex-col justify-between p-6 overflow-hidden animate-in slide-in-from-right duration-300">
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center gap-2 text-[var(--color-foreground)] font-bold text-sm">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Tags Dinâmicas Disponíveis</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVariablesDrawer(false)}
                  className="rounded-lg p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)] transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-[var(--color-muted-foreground)]">
                Clique sobre qualquer tag para copiá-la. Cole no local desejado do contrato para que
                o sistema injete o valor correspondente.
              </p>

              {/* Campo de Busca de Tags */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                <input
                  type="text"
                  placeholder="Buscar tag (ex: valor, cliente, kwp, chave_pix)..."
                  value={varSearchQuery}
                  onChange={(e) => setVarSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] pl-9 pr-3 py-1.5 text-xs text-[var(--color-foreground)] outline-none focus:border-[var(--color-primary)] transition"
                />
              </div>

              {/* Lista de Tags com Rolagem */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredVariables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => handleCopyVariable(v.key)}
                    className="w-full text-left p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] hover:border-emerald-500/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition group flex items-start justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 group-hover:underline">
                          &#123;&#123;{v.key}&#125;&#125;
                        </code>
                        <span className="text-[10px] text-[var(--color-muted-foreground)] px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800">
                          {v.category}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-[var(--color-foreground)]">
                        {v.label}
                      </p>
                      <p className="text-[10px] text-[var(--color-muted-foreground)]">
                        {v.description}
                      </p>
                    </div>

                    <div className="shrink-0 p-1 text-[var(--color-muted-foreground)] group-hover:text-emerald-600 transition">
                      {copiedKey === v.key ? (
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                ))}

                {filteredVariables.length === 0 && (
                  <p className="text-center text-xs text-[var(--color-muted-foreground)] py-6">
                    Nenhuma variável dinâmica encontrada para "{varSearchQuery}".
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setShowVariablesDrawer(false)}
              >
                Fechar Gaveta
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Restaurar Padrão de Fábrica */}
      {showResetConfirm && (
        <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <RotateCcw className="h-5 w-5" />
                <DialogTitle className="text-base font-bold">
                  Restaurar Padrão de Fábrica?
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-[var(--color-muted-foreground)] pt-2 space-y-2">
                <p>
                  Esta ação irá descartar todas as customizações salvas para o modelo de{" "}
                  <strong>
                    {activeTab === "CONTRATO_PF"
                      ? "Contrato de Venda Solar"
                      : "Procuração de Homologação ANEEL"}
                  </strong>{" "}
                  e restaurar o texto jurídico original de fábrica da EnergivIA.
                </p>
                <p>
                  Os contratos e procurações de vendas antigas que já foram emitidos ou assinados
                  não serão modificados.
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowResetConfirm(false)}
                disabled={resetting}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleResetToFactory}
                disabled={resetting}
                className="text-xs gap-1.5"
              >
                {resetting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                <span>{resetting ? "Restaurando..." : "Sim, Restaurar Padrão"}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
