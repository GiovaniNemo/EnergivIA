"use client";

import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import type { ProposalTemplateRevisionEntity } from "@/lib/proposal-templates-api";

interface TemplateHistoryModalProps {
  open: boolean;
  loading?: boolean;
  revisions: ProposalTemplateRevisionEntity[];
  onClose: () => void;
  onPreviewRevision: (revision: ProposalTemplateRevisionEntity) => void;
  onRestoreRevision: (revision: ProposalTemplateRevisionEntity) => void;
}

export function TemplateHistoryModal({
  open,
  loading = false,
  revisions,
  onClose,
  onPreviewRevision,
  onRestoreRevision,
}: TemplateHistoryModalProps): JSX.Element | null {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm">
      <div className="mx-auto mt-12 w-[92vw] max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
              Histórico de versões
            </h3>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              Selecione uma versão publicada para visualizar ou restaurar como rascunho.
            </p>
          </div>
          <Button variant="outline" className="border-[var(--color-border)]" onClick={onClose}>
            Fechar
          </Button>
        </div>

        {loading ? (
          <LoadingState
            label="Carregando histórico"
            description=""
            compact
            className="min-h-[140px]"
          />
        ) : revisions.length ? (
          <div className="space-y-2">
            {revisions.map((revision) => (
              <div
                key={revision.id}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    Versão {revision.version}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    Publicada em {new Date(revision.publishedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[var(--color-border)]"
                    onClick={() => onPreviewRevision(revision)}
                  >
                    Visualizar
                  </Button>
                  <Button
                    size="sm"
                    className="border border-emerald-300/20 bg-gradient-to-r from-emerald-400 to-emerald-500 text-zinc-950 hover:from-emerald-300 hover:to-emerald-400"
                    onClick={() => onRestoreRevision(revision)}
                  >
                    Restaurar como rascunho
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-sm text-[var(--color-muted-foreground)]">
            Nenhuma versão publicada encontrada.
          </div>
        )}
      </div>
    </div>
  );
}
