"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Download,
  MoreHorizontal,
  PencilLine,
  Rocket,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeaderBarProps {
  title: string;
  templateStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  templateVersion: number;
  catalogEditor?: boolean;
  onTitleChange: (value: string) => void;
  onBack?: () => void;
  onSave: () => void;
  onImport: () => void;
  onViewHistory: () => void;
  onPreview: () => void;
  onDownloadPdf: () => void;
  onPublish: () => void;
}

export function HeaderBar({
  title,
  templateStatus,
  templateVersion,
  catalogEditor = false,
  onTitleChange,
  onBack,
  onSave,
  onImport,
  onViewHistory,
  onPreview,
  onDownloadPdf,
  onPublish,
}: HeaderBarProps): JSX.Element {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftTitle(title);
  }, [title]);

  useEffect(() => {
    if (!isActionsMenuOpen) return;
    function handleClickOutside(event: MouseEvent): void {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (actionsMenuRef.current?.contains(target)) return;
      setIsActionsMenuOpen(false);
    }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isActionsMenuOpen]);

  function handleConfirmTitle() {
    const next = draftTitle.trim();
    if (next) onTitleChange(next);
    setIsEditingTitle(false);
  }

  function handleCancelTitle() {
    setDraftTitle(title);
    setIsEditingTitle(false);
  }

  function handlePublishClick() {
    const message = catalogEditor
      ? "Publicar este modelo no catálogo? Ele ficará disponível para importação por todas as organizações (usuários autenticados)."
      : `Publicar versão ${templateVersion + 1}? Esta versão ficará ativa para o template.`;
    const confirmed = window.confirm(message);
    if (!confirmed) return;
    onPublish();
  }

  const statusLabel =
    templateStatus === "PUBLISHED"
      ? "Publicado"
      : templateStatus === "ARCHIVED"
        ? "Arquivado"
        : "Ativo";

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 shadow-[0_8px_30px_rgba(2,6,23,0.12)] backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-2 pr-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        {isEditingTitle ? (
          <div className="flex min-w-0 items-center gap-1">
            <Input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              className="h-9 w-[320px] max-w-[45vw] border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-foreground)]"
              autoFocus
            />
            <button
              type="button"
              onClick={handleConfirmTitle}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
              aria-label="Confirmar título"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleCancelTitle}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
              aria-label="Cancelar edição do título"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-[24px] font-semibold leading-none text-[var(--color-foreground)]">
              {title}
            </h1>
            <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-0.5 text-[11px] text-[var(--color-muted-foreground)]">
              {catalogEditor ? statusLabel : `${statusLabel} v${templateVersion}`}
            </span>
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
              aria-label="Editar título do template"
            >
              <PencilLine className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      <div className="ml-4 flex items-center gap-2">
        <div ref={actionsMenuRef} className="relative">
          <Button
            variant="outline"
            className="h-9 w-9 border-[var(--color-border)] bg-[var(--color-card)] p-0 text-[var(--color-foreground)] hover:bg-[var(--color-accent)]"
            onClick={() => setIsActionsMenuOpen((prev) => !prev)}
            aria-label="Mais ações"
            aria-expanded={isActionsMenuOpen}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {isActionsMenuOpen ? (
            <div className="absolute right-0 top-11 z-30 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-[0_14px_32px_rgba(2,6,23,0.22)]">
              <button
                type="button"
                onClick={() => {
                  setIsActionsMenuOpen(false);
                  onSave();
                }}
                className="flex h-9 w-full items-center rounded-lg px-2.5 text-sm text-[var(--color-foreground)] transition hover:bg-[var(--color-accent)]"
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar alterações
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsActionsMenuOpen(false);
                  onImport();
                }}
                className="flex h-9 w-full items-center rounded-lg px-2.5 text-sm text-[var(--color-foreground)] transition hover:bg-[var(--color-accent)]"
              >
                Importar template
              </button>
              {!catalogEditor ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    onViewHistory();
                  }}
                  className="flex h-9 w-full items-center rounded-lg px-2.5 text-sm text-[var(--color-foreground)] transition hover:bg-[var(--color-accent)]"
                >
                  Histórico
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setIsActionsMenuOpen(false);
                  onPreview();
                }}
                className="flex h-9 w-full items-center rounded-lg px-2.5 text-sm text-[var(--color-foreground)] transition hover:bg-[var(--color-accent)]"
              >
                Visualizar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsActionsMenuOpen(false);
                  onDownloadPdf();
                }}
                className="flex h-9 w-full items-center rounded-lg px-2.5 text-sm text-[var(--color-foreground)] transition hover:bg-[var(--color-accent)]"
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </button>
            </div>
          ) : null}
        </div>
        <Button
          className="h-9 border border-emerald-300/20 bg-gradient-to-r from-emerald-400 to-emerald-500 text-zinc-950 hover:from-emerald-300 hover:to-emerald-400"
          onClick={handlePublishClick}
        >
          <Rocket className="mr-2 h-4 w-4" />
          {catalogEditor ? "Publicar no catálogo" : "Publicar versão"}
        </Button>
      </div>
    </header>
  );
}
