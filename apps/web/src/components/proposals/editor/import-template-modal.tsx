"use client";

import { useEffect, type ReactNode } from "react";
import { LayoutTemplate, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TemplateBlueprintSummary } from "@/lib/template-blueprints-api";
import type { ProposalDocumentJson, SavedTemplate, TemplatePreset } from "./types";

interface ImportTemplateModalProps {
  onClose: () => void;
  catalogItems: TemplateBlueprintSummary[];
  catalogLoading?: boolean;
  catalogError?: string | null;
  catalogImportingId?: string | null;
  onImportCatalog?: (id: string) => void;
  presets?: TemplatePreset[];
  savedTemplates?: SavedTemplate[];
  onImport: (payload: ProposalDocumentJson, name: string) => void;
}

function TemplateCardGrid(props: { children: ReactNode }): JSX.Element {
  return <div className="grid gap-3.5 sm:grid-cols-2">{props.children}</div>;
}

export function ImportTemplateModal({
  onClose,
  catalogItems,
  catalogLoading = false,
  catalogError = null,
  catalogImportingId = null,
  onImportCatalog,
  presets: _presets = [],
  savedTemplates = [],
  onImport,
}: ImportTemplateModalProps): JSX.Element {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex flex-col max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-import-template-title"
      >
        {/* Header fixo do modal - nunca encoberto pela topbar */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5 sm:px-6 sm:py-4 shrink-0 bg-[var(--color-card)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3
                id="modal-import-template-title"
                className="text-base sm:text-lg font-semibold text-[var(--color-foreground)] leading-tight"
              >
                Importar Template de Proposta
              </h3>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Escolha um modelo do catálogo oficial ou use um template salvo da sua organização.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Corpo com scroll interno */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-6">
          {/* Seção Catálogo Oficial EnergivIA (Blueprints gerenciados no Admin) */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Catálogo Oficial EnergivIA
              </p>
              {catalogItems.length > 0 ? (
                <span className="text-[11px] font-medium text-emerald-400">
                  {catalogItems.length}{" "}
                  {catalogItems.length === 1 ? "modelo disponível" : "modelos disponíveis"}
                </span>
              ) : null}
            </div>

            {catalogError ? <p className="text-sm text-destructive py-2">{catalogError}</p> : null}

            {catalogLoading ? (
              <div className="flex items-center justify-center py-10 text-sm text-[var(--color-muted-foreground)]">
                Carregando catálogo de modelos…
              </div>
            ) : null}

            {!catalogLoading && !catalogItems.length && !catalogError ? (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-muted-foreground)]">
                Nenhum modelo publicado no catálogo no momento.
              </div>
            ) : null}

            {catalogItems.length > 0 ? (
              <TemplateCardGrid>
                {catalogItems.map((template) => (
                  <div
                    key={template.id}
                    className="flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3.5 transition hover:border-emerald-500/40"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-slate-900">
                        {template.thumbnailUrl ? (
                          <img
                            src={template.thumbnailUrl}
                            alt={`Preview do template ${template.name}`}
                            className="h-full w-full object-cover transition duration-300 hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-emerald-950/40 to-slate-900">
                            <LayoutTemplate className="h-6 w-6 text-emerald-400 mb-1 opacity-80" />
                            <span className="text-[10px] font-medium text-slate-300">
                              Modelo Oficial
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="font-semibold text-sm text-[var(--color-foreground)] line-clamp-2 leading-snug"
                          title={template.name}
                        >
                          {template.name}
                        </p>
                        <p className="mt-1.5 text-xs text-[var(--color-muted-foreground)] line-clamp-3 leading-relaxed">
                          {template.description ||
                            "Modelo com estrutura completa de alta conversão comercial."}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3.5 w-full border-[var(--color-border)] font-semibold hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 transition"
                      disabled={!onImportCatalog || catalogImportingId !== null}
                      onClick={() => onImportCatalog?.(template.id)}
                    >
                      {catalogImportingId === template.id ? "Carregando…" : "Carregar modelo"}
                    </Button>
                  </div>
                ))}
              </TemplateCardGrid>
            ) : null}
          </div>

          {/* Seção Templates Salvos da Organização */}
          {savedTemplates.length > 0 ? (
            <div className="border-t border-[var(--color-border)] pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Salvos para esta organização
              </p>
              <TemplateCardGrid>
                {savedTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3.5 transition hover:border-emerald-500/40"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
                        {template.thumbnailUrl ? (
                          <img
                            src={template.thumbnailUrl}
                            alt={`Preview do template ${template.name}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center p-2 text-[10px] text-[var(--color-muted-foreground)] text-center">
                            Template Salvo
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-[var(--color-foreground)] line-clamp-2">
                          {template.name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                          Salvo em {new Date(template.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3.5 w-full border-[var(--color-border)] font-semibold"
                      onClick={() => onImport(template.payload, template.name)}
                    >
                      Carregar template salvo
                    </Button>
                  </div>
                ))}
              </TemplateCardGrid>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
