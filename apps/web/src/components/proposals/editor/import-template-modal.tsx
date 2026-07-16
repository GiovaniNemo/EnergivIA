"use client";

import type { ReactNode } from "react";
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
  presets: TemplatePreset[];
  savedTemplates: SavedTemplate[];
  onImport: (payload: ProposalDocumentJson, name: string) => void;
}

function TemplateCardGrid(props: { children: ReactNode }): JSX.Element {
  return <div className="grid gap-3 md:grid-cols-2">{props.children}</div>;
}

export function ImportTemplateModal({
  onClose,
  catalogItems,
  catalogLoading = false,
  catalogError = null,
  catalogImportingId = null,
  onImportCatalog,
  presets,
  savedTemplates,
  onImport,
}: ImportTemplateModalProps): JSX.Element {
  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm">
      <div className="mx-auto mt-12 max-h-[85vh] w-[92vw] max-w-4xl overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
            Importar Template
          </h3>
          <Button variant="outline" className="border-[var(--color-border)]" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-sm font-semibold text-[var(--color-foreground)]">
            Da Energivia (catálogo)
          </p>
          {catalogError ? <p className="text-sm text-destructive">{catalogError}</p> : null}
          {catalogLoading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Carregando modelos…</p>
          ) : null}
          {!catalogLoading && !catalogItems.length && !catalogError ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Nenhum modelo publicado no catálogo no momento.
            </p>
          ) : null}
          {catalogItems.length > 0 ? (
            <TemplateCardGrid>
              {catalogItems.map((template) => (
                <div
                  key={template.id}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="h-36 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
                      {template.thumbnailUrl ? (
                        <img
                          src={template.thumbnailUrl}
                          alt={`Preview do template ${template.name}`}
                          className="block h-full w-auto object-contain"
                        />
                      ) : (
                        <div className="flex h-full min-w-24 items-center justify-center px-2 text-[10px] text-[var(--color-muted-foreground)]">
                          Sem preview
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {template.name}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                        {template.description ?? ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 border-[var(--color-border)]"
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

        <div className="mb-2">
          <p className="mb-2 text-sm font-semibold text-[var(--color-foreground)]">Presets</p>
        </div>
        <TemplateCardGrid>
          {presets.map((template) => (
            <div
              key={template.id}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-3"
            >
              <div className="flex items-start gap-2">
                <div className="h-36 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
                  {template.thumbnailUrl ? (
                    <img
                      src={template.thumbnailUrl}
                      alt={`Preview do template ${template.name}`}
                      className="block h-full w-auto object-contain"
                    />
                  ) : (
                    <div className="flex h-full min-w-24 items-center justify-center px-2 text-[10px] text-[var(--color-muted-foreground)]">
                      Sem preview
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--color-foreground)]">{template.name}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    {template.description}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 border-[var(--color-border)]"
                onClick={() => onImport(template.payload, template.name)}
              >
                Carregar preset
              </Button>
            </div>
          ))}
        </TemplateCardGrid>

        {savedTemplates.length ? (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-[var(--color-foreground)]">
              Salvos para esta organizacao
            </p>
            <TemplateCardGrid>
              {savedTemplates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="h-36 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
                      {template.thumbnailUrl ? (
                        <img
                          src={template.thumbnailUrl}
                          alt={`Preview do template ${template.name}`}
                          className="block h-full w-auto object-contain"
                        />
                      ) : (
                        <div className="flex h-full min-w-24 items-center justify-center px-2 text-[10px] text-[var(--color-muted-foreground)]">
                          Sem preview
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {template.name}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        {new Date(template.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 border-[var(--color-border)]"
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
  );
}
