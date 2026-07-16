"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilePenLine, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  archiveProposalTemplate,
  createProposalTemplate,
  listProposalTemplates,
  type ProposalTemplateEntity,
} from "@/lib/proposal-templates-api";
import {
  proposalDocumentJsonToTemplateConfig,
  TEMPLATE_THUMBNAIL_DATA_URL_KEY,
} from "@/lib/proposal-document-to-template-config";
import { createScratchProposalDocument } from "@/components/proposals/scratch-template-document";
import { DEFAULT_PROPOSAL_TEMPLATE_CONFIG } from "@energivia/shared-types";

function getStatusLabel(status: "DRAFT" | "PUBLISHED" | "ARCHIVED"): string {
  if (status === "DRAFT") return "Ativo";
  if (status === "PUBLISHED") return "Publicado";
  return "Arquivado";
}

function getStatusBadgeClass(status: "DRAFT" | "PUBLISHED" | "ARCHIVED"): string {
  if (status === "PUBLISHED") {
    return "border-emerald-500/35 bg-emerald-500/12 text-emerald-300";
  }
  if (status === "ARCHIVED") {
    return "border-zinc-500/35 bg-zinc-500/12 text-zinc-300";
  }
  return "border-emerald-500/35 bg-emerald-500/12 text-emerald-300";
}

function getTemplateThumbnail(template: ProposalTemplateEntity): string | undefined {
  const maybeStyles = template.config.editor?.styles;
  if (!maybeStyles || typeof maybeStyles !== "object") return undefined;
  const raw = (maybeStyles as Record<string, unknown>)[TEMPLATE_THUMBNAIL_DATA_URL_KEY];
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  if (!value) return undefined;
  if (value.startsWith("data:image/")) return value;
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  return undefined;
}

export function TemplateListPage(): JSX.Element {
  const router = useRouter();
  const { currentOrganizationId } = useOrganization();
  const [templates, setTemplates] = useState<ProposalTemplateEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentOrganizationId) return;
    void (async () => {
      try {
        setLoading(true);
        const data = await listProposalTemplates(currentOrganizationId);
        setTemplates(data.filter((template) => template.status !== "ARCHIVED"));
        setError("");
      } catch {
        setError("Nao foi possivel carregar os templates.");
      } finally {
        setLoading(false);
      }
    })();
  }, [currentOrganizationId]);

  async function handleCreateTemplateChoice(mode: "preset" | "scratch") {
    if (!currentOrganizationId || creating) return;
    try {
      setCreating(true);
      setError("");
      setCreateDialogOpen(false);
      const config =
        mode === "scratch"
          ? proposalDocumentJsonToTemplateConfig(createScratchProposalDocument())
          : DEFAULT_PROPOSAL_TEMPLATE_CONFIG;
      const descriptions: Record<typeof mode, string> = {
        preset: "Escolha um modelo pré-definido ou do catálogo na janela de importação.",
        scratch: "Estrutura inicial mínima para montar o template do zero no editor.",
      };
      const created = await createProposalTemplate(
        {
          name: "Novo template",
          description: descriptions[mode],
          config,
        },
        currentOrganizationId
      );
      const query = mode === "preset" ? "?novo=modelo" : "";
      router.push(`/proposals/templates/${created.id}${query}`);
    } catch {
      setError("Nao foi possivel criar o template.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteTemplate(template: ProposalTemplateEntity) {
    if (!currentOrganizationId || deletingTemplateId) return;
    const confirmed = window.confirm(
      `Excluir o template "${template.name}"? Você poderá recuperar somente via backend.`
    );
    if (!confirmed) return;

    try {
      setDeletingTemplateId(template.id);
      setError("");
      await archiveProposalTemplate(template.id, currentOrganizationId);
      setTemplates((prev) => prev.filter((item) => item.id !== template.id));
    } catch {
      setError("Nao foi possivel excluir o template.");
    } finally {
      setDeletingTemplateId(null);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates de Proposta</h1>
          <p className="mt-1 text-[var(--color-muted-foreground)]">
            Selecione um template para editar.
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          disabled={!currentOrganizationId || creating}
        >
          {creating ? "Criando..." : "Novo template"}
        </Button>
      </header>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent
          muiMaxWidth="xs"
          className="border-[var(--color-border)] bg-[var(--color-card)] p-6"
        >
          <DialogHeader>
            <DialogTitle>Como você quer criar?</DialogTitle>
            <DialogDescription>
              Escolha um caminho. Você pode mudar depois dentro do editor.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid gap-3">
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleCreateTemplateChoice("preset")}
              className="flex w-full items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-left transition hover:border-emerald-500/40 hover:bg-[var(--color-accent)] disabled:opacity-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                <LayoutTemplate className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold text-[var(--color-foreground)]">
                  Usar um modelo pré-definido
                </span>
                <span className="mt-0.5 block text-sm text-[var(--color-muted-foreground)]">
                  Presets internos, modelos do catálogo Energivia ou templates salvos da
                  organização.
                </span>
              </span>
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleCreateTemplateChoice("scratch")}
              className="flex w-full items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-left transition hover:border-emerald-500/40 hover:bg-[var(--color-accent)] disabled:opacity-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-500/15 text-zinc-300">
                <FilePenLine className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold text-[var(--color-foreground)]">
                  Criar do zero
                </span>
                <span className="mt-0.5 block text-sm text-[var(--color-muted-foreground)]">
                  Começa com uma estrutura básica de seções para você preencher manualmente.
                </span>
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <LoadingState label="Carregando templates" compact className="min-h-[180px]" />
      ) : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {!loading && !templates.length ? (
        <Card className="border-[var(--color-border)] bg-[var(--color-card)]">
          <CardHeader>
            <CardTitle>Nenhum template encontrado</CardTitle>
            <CardDescription>Crie um template inicial para comecar a edicao.</CardDescription>
            <Button
              className="mt-4 w-fit"
              disabled={!currentOrganizationId || creating}
              onClick={() => setCreateDialogOpen(true)}
            >
              Criar primeiro template
            </Button>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
          {templates.map((template) => {
            const thumbnailUrl = getTemplateThumbnail(template);
            return (
              <Card
                key={template.id}
                className="border-[var(--color-border)] bg-[var(--color-card)]"
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="h-36 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-background)]">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
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
                      <CardTitle className="line-clamp-1">{template.name}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {template.description || "Template sem descricao"}
                      </CardDescription>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] ${getStatusBadgeClass(template.status)}`}
                        >
                          {getStatusLabel(template.status)}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                          v{template.version}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Link href={`/proposals/templates/${template.id}`}>
                          <Button size="sm">Editar</Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/40 text-red-300 hover:bg-red-500/15"
                          disabled={deletingTemplateId === template.id}
                          onClick={() => void handleDeleteTemplate(template)}
                        >
                          {deletingTemplateId === template.id ? "Excluindo..." : "Excluir"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
