"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FilePenLine, LayoutTemplate, Lock, Info } from "lucide-react";
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
  updateProposalTemplate,
  type ProposalTemplateEntity,
} from "@/lib/proposal-templates-api";
import {
  proposalDocumentJsonToTemplateConfig,
  TEMPLATE_THUMBNAIL_DATA_URL_KEY,
} from "@/lib/proposal-document-to-template-config";
import { createScratchProposalDocument } from "@/components/proposals/scratch-template-document";

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
  const cfg = template.config as unknown as Record<string, unknown> | undefined;
  if (!cfg) return undefined;

  const ed = cfg.editor as Record<string, unknown> | undefined;
  const styles = (ed?.styles || cfg.styles) as Record<string, unknown> | undefined;

  // 1. Thumbnail data URL explícito
  if (styles) {
    const raw = styles[TEMPLATE_THUMBNAIL_DATA_URL_KEY];
    if (typeof raw === "string" && raw.trim()) {
      const v = raw.trim();
      if (v.startsWith("data:image/") || /^https?:\/\//i.test(v) || v.startsWith("/")) {
        return v;
      }
    }

    // 2. Imagem de capa nos styles
    const coverObj = styles.cover as Record<string, unknown> | undefined;
    const coverUrl = coverObj?.imageUrl;
    if (typeof coverUrl === "string" && coverUrl.trim() && coverUrl !== "undefined") {
      const v = coverUrl.trim();
      if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
    }
  }

  // 3. Imagem de capa nos sections (fields ou content)
  const sections = (ed?.sections || cfg.sections) as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(sections)) {
    const coverSec = sections.find((s) => s.type === "cover" || s.key === "cover");
    if (coverSec) {
      const fields = coverSec.fields as Record<string, unknown> | undefined;
      const content = coverSec.content as Record<string, unknown> | undefined;
      const bg =
        fields?.backgroundImage || content?.backgroundImage || fields?.image || content?.image;
      if (typeof bg === "string" && bg.trim() && bg !== "undefined") {
        const v = bg.trim();
        if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
      }
    }
  }

  // 4. Tema global
  const theme = cfg.theme as Record<string, unknown> | undefined;
  if (theme && typeof theme.coverImageUrl === "string" && theme.coverImageUrl.trim()) {
    const v = theme.coverImageUrl.trim();
    if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
  }

  return undefined;
}

function getTemplatePrimaryColor(template: ProposalTemplateEntity): string {
  const cfg = template.config as unknown as Record<string, unknown> | undefined;
  const ed = cfg?.["editor"] as Record<string, unknown> | undefined;
  const styles = (ed?.["styles"] || cfg?.["styles"]) as Record<string, unknown> | undefined;
  const branding = styles?.["branding"] as Record<string, unknown> | undefined;
  const color = branding?.["primaryColor"];
  if (typeof color === "string" && color.trim()) return color.trim();
  const theme = cfg?.["theme"] as Record<string, unknown> | undefined;
  const themeColor = theme?.["primaryColor"];
  if (typeof themeColor === "string" && themeColor.trim()) {
    return themeColor.trim();
  }
  return "#059669";
}

function TemplateCardPreview({
  template,
  thumbnailUrl,
}: {
  template: ProposalTemplateEntity;
  thumbnailUrl?: string;
}): JSX.Element {
  const [imageError, setImageError] = useState(false);
  const primaryColor = getTemplatePrimaryColor(template);

  const sectionsCount =
    template.config.editor?.sections?.length ||
    (template.config.sections as unknown as unknown[])?.length ||
    0;

  if (thumbnailUrl && !imageError) {
    return (
      <div className="relative h-44 w-full overflow-hidden bg-slate-900">
        <img
          src={thumbnailUrl}
          alt={`Preview do template ${template.name}`}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-card)] via-transparent to-black/30" />
        {template.isDefault && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/85 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-emerald-300 shadow-md">
              <Check className="h-3 w-3" /> Padrão
            </span>
          </div>
        )}
        {sectionsCount > 0 && (
          <div className="absolute bottom-2 left-3">
            <span className="inline-flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-slate-200">
              {sectionsCount} seções
            </span>
          </div>
        )}
      </div>
    );
  }

  // Mini mockup elegante quando não houver imagem fotográfica
  return (
    <div
      className="relative flex h-44 w-full flex-col justify-between overflow-hidden p-4 transition-colors"
      style={{
        background: `radial-gradient(ellipse at top right, ${primaryColor}25 0%, rgba(15, 23, 42, 0.95) 75%)`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ backgroundColor: `${primaryColor}33`, color: primaryColor }}
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
          </div>
          <span className="text-[11px] font-medium text-slate-400">Proposta Comercial</span>
        </div>
        {template.isDefault && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/80 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
            <Check className="h-3 w-3" /> Padrão
          </span>
        )}
      </div>

      <div className="my-auto space-y-2 rounded-lg border border-white/5 bg-white/[0.03] p-3 backdrop-blur-sm">
        <div className="h-2 w-3/4 rounded bg-white/20" />
        <div className="h-1.5 w-1/2 rounded bg-white/10" />
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <div className="h-3.5 rounded bg-white/[0.05]" />
          <div className="h-3.5 rounded bg-white/[0.05]" />
          <div className="h-3.5 rounded bg-white/[0.05]" />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span>v{template.version}</span>
        {sectionsCount > 0 && <span>{sectionsCount} seções</span>}
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { ImportTemplateModal } from "./editor/import-template-modal";
import {
  getTemplateBlueprint,
  listPublishedTemplateBlueprints,
} from "@/lib/template-blueprints-api";
import type { ProposalDocumentJson } from "./editor/types";

export function TemplateListPage(): JSX.Element {
  const router = useRouter();
  const { currentOrganizationId, user } = useOrganization();
  const isAdmin = user?.role === "ADMIN" || user?.role === "PLATFORM";
  const hasPaidPlan =
    user?.planTier === "PLUS" ||
    user?.planTier === "PRO" ||
    user?.planTier === "ESSENCIAL" ||
    Boolean(user?.isTrial === false);
  const isTrial = !isAdmin && (user?.isTrial ?? !hasPaidPlan);
  const [templates, setTemplates] = useState<ProposalTemplateEntity[]>([]);
  const isLimitReached =
    !isAdmin &&
    !isTrial &&
    user?.customTemplatesLimit !== null &&
    user?.customTemplatesLimit !== undefined &&
    templates.length >= user.customTemplatesLimit;
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [templateUpgradeModalOpen, setTemplateUpgradeModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [catalogImportingId, setCatalogImportingId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const {
    data: catalogBlueprints = [],
    isLoading: catalogBlueprintsLoading,
    error: catalogBlueprintsError,
  } = useQuery({
    queryKey: ["published-template-blueprints", currentOrganizationId],
    queryFn: () => listPublishedTemplateBlueprints(currentOrganizationId!),
    enabled: importOpen && Boolean(currentOrganizationId),
  });

  useEffect(() => {
    if (!currentOrganizationId) return;
    void (async () => {
      try {
        setLoading(true);
        const data = await listProposalTemplates(currentOrganizationId);
        setTemplates(data.filter((template) => template.status !== "ARCHIVED"));
        setError("");
      } catch {
        setError("Não foi possível carregar os templates.");
      } finally {
        setLoading(false);
      }
    })();
  }, [currentOrganizationId]);

  async function handleCreateTemplateChoice(mode: "preset" | "scratch") {
    if (!currentOrganizationId || creating) return;
    if (mode === "preset") {
      setCreateDialogOpen(false);
      setImportOpen(true);
      return;
    }

    if (isTrial || isLimitReached) {
      setCreateDialogOpen(false);
      setTemplateUpgradeModalOpen(true);
      return;
    }

    try {
      setCreating(true);
      setError("");
      setCreateDialogOpen(false);
      const config = proposalDocumentJsonToTemplateConfig(createScratchProposalDocument());
      const created = await createProposalTemplate(
        {
          name: "Novo template",
          description: "Estrutura inicial mínima para montar o template do zero no editor.",
          config,
        },
        currentOrganizationId
      );
      router.push(`/proposals/templates/${created.id}`);
    } catch {
      setError("Não foi possível criar o template.");
    } finally {
      setCreating(false);
    }
  }

  async function handleImportConfig(payload: ProposalDocumentJson, name: string) {
    if (!currentOrganizationId) return;
    try {
      setCreating(true);
      setError("");
      const config = proposalDocumentJsonToTemplateConfig(payload);
      const created = await createProposalTemplate(
        {
          name,
          description: "Modelo oficial da EnergivIA carregado para uso.",
          config,
          isOfficial: true,
        },
        currentOrganizationId
      );
      setImportOpen(false);
      setTemplates((prev) => [created, ...prev]);
      if (!isTrial) {
        router.push(`/proposals/templates/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o modelo.");
    } finally {
      setCreating(false);
      setCatalogImportingId(null);
    }
  }

  async function handleImportCatalogBlueprint(blueprintId: string) {
    if (!currentOrganizationId) return;
    setCatalogImportingId(blueprintId);
    try {
      const detail = await getTemplateBlueprint(blueprintId, currentOrganizationId);
      await handleImportConfig(detail.document, detail.name);
    } catch {
      setError("Não foi possível baixar o modelo do catálogo.");
      setCatalogImportingId(null);
    }
  }

  async function handleSetDefault(template: ProposalTemplateEntity) {
    if (!currentOrganizationId || settingDefaultId) return;
    try {
      setSettingDefaultId(template.id);
      setError("");
      await updateProposalTemplate(template.id, { isDefault: true }, currentOrganizationId);
      setTemplates((prev) =>
        prev.map((t) => ({
          ...t,
          isDefault: t.id === template.id,
        }))
      );
    } catch {
      setError("Não foi possível definir o template como padrão.");
    } finally {
      setSettingDefaultId(null);
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
      setError("Não foi possível excluir o template.");
    } finally {
      setDeletingTemplateId(null);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      {isTrial && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-sky-500/30 bg-sky-50 dark:bg-sky-950/20 px-4 py-3 text-sm text-sky-950 dark:text-sky-200">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
            <span>
              <strong>Modo de Avaliação:</strong> Você tem acesso aos modelos oficiais padrão da
              EnergivIA para gerar suas propostas. A criação de templates personalizados é liberada
              no <strong>Plano Essencial</strong> (1 template) e <strong>Plano Pro</strong>{" "}
              (ilimitado).
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-sky-600/40 text-sky-900 dark:text-sky-300 hover:bg-sky-500/10 dark:hover:bg-sky-500/20"
            onClick={() => {
              window.location.href = "/gestao/meus-planos";
            }}
          >
            Ver Planos
          </Button>
        </div>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates de Proposta</h1>
          <p className="mt-1 text-[var(--color-muted-foreground)]">
            {isTrial
              ? "Modelos oficiais disponíveis para uso em suas propostas."
              : "Selecione um template para visualizar, usar ou personalizar."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            disabled={!currentOrganizationId || creating}
            className="border-sky-500/40 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10"
          >
            <LayoutTemplate className="mr-1.5 h-4 w-4" /> Carregar modelo oficial
          </Button>
          <Button
            onClick={() => {
              if (isTrial || isLimitReached) {
                setTemplateUpgradeModalOpen(true);
              } else {
                setCreateDialogOpen(true);
              }
            }}
            disabled={!currentOrganizationId || creating}
          >
            {creating ? (
              "Criando..."
            ) : isTrial || isLimitReached ? (
              <span className="flex items-center gap-1.5">
                <Lock className="h-4 w-4" /> Criar personalizado
              </span>
            ) : (
              "Novo template"
            )}
          </Button>
        </div>
      </header>

      {/* Modal de Upgrade para Criação/Edição de Templates */}
      <Dialog open={templateUpgradeModalOpen} onOpenChange={setTemplateUpgradeModalOpen}>
        <DialogContent
          muiMaxWidth="xs"
          className="border-[var(--color-border)] bg-[var(--color-card)] p-6"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <span className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2 text-sky-400">
                <LayoutTemplate className="h-5 w-5" />
              </span>
              Personalização de Templates
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              {isTrial ? (
                <>
                  No período de teste gratuito, você pode utilizar todos os templates oficiais
                  padrão da EnergivIA. A criação de templates personalizados exclusivos é liberada
                  no <strong>Plano Essencial</strong> (1 template próprio) e nos planos{" "}
                  <strong>Pro</strong> e <strong>Plus</strong> (ilimitados).
                </>
              ) : (
                <>
                  Você atingiu o limite de{" "}
                  <strong>{user?.customTemplatesLimit ?? 1} template personalizado</strong> do seu
                  plano ({user?.planName || "Plano Essencial"}). Para criar templates e layouts
                  ilimitados, faça upgrade para o <strong>Plano Pro</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setTemplateUpgradeModalOpen(false)}>
              Fechar
            </Button>
            <Button
              className="bg-sky-500 font-bold text-slate-950 hover:bg-sky-400"
              onClick={() => {
                setTemplateUpgradeModalOpen(false);
                window.location.href = "/gestao/meus-planos";
              }}
            >
              Conhecer Planos &rarr;
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {importOpen && (
        <ImportTemplateModal
          onClose={() => setImportOpen(false)}
          catalogItems={catalogBlueprints}
          catalogLoading={catalogBlueprintsLoading}
          catalogError={
            catalogBlueprintsError instanceof Error ? catalogBlueprintsError.message : null
          }
          catalogImportingId={catalogImportingId}
          onImportCatalog={handleImportCatalogBlueprint}
          savedTemplates={[]}
          onImport={handleImportConfig}
        />
      )}

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
                  Presets internos e modelos oficiais do catálogo EnergivIA.
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
                {isTrial || isLimitReached ? (
                  <Lock className="h-5 w-5 text-amber-400" aria-hidden />
                ) : (
                  <FilePenLine className="h-5 w-5" aria-hidden />
                )}
              </span>
              <span>
                <span className="flex items-center gap-1.5 font-semibold text-[var(--color-foreground)]">
                  Criar do zero
                  {(isTrial || isLimitReached) && (
                    <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                      Pro / Essencial
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-sm text-[var(--color-muted-foreground)]">
                  {isTrial
                    ? "Exclusivo para planos pagos. Personalize seções e blocos do zero."
                    : "Começa com uma estrutura básica de seções para você preencher manualmente."}
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
            <CardDescription>
              {isTrial
                ? "Carregue um dos modelos oficiais da EnergivIA para começar a enviar propostas."
                : "Carregue um modelo oficial ou crie um template inicial para começar a edição."}
            </CardDescription>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                disabled={!currentOrganizationId || creating}
                onClick={() => setImportOpen(true)}
              >
                <LayoutTemplate className="mr-1.5 h-4 w-4" /> Carregar modelo oficial
              </Button>
              {!isTrial && (
                <Button
                  variant="outline"
                  disabled={!currentOrganizationId || creating}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Criar do zero
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((template) => {
            const thumbnailUrl = getTemplateThumbnail(template);
            return (
              <Card
                key={template.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] transition-all duration-200 hover:border-emerald-500/40 hover:shadow-lg"
              >
                <TemplateCardPreview template={template} thumbnailUrl={thumbnailUrl} />

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <h3
                      className="text-base font-bold text-[var(--color-foreground)] line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors"
                      title={template.name}
                    >
                      {template.name}
                    </h3>
                    <p
                      className="mt-1.5 text-xs text-[var(--color-muted-foreground)] line-clamp-2 leading-relaxed"
                      title={template.description || ""}
                    >
                      {template.description ||
                        "Template pronto para envio de propostas comerciais."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--color-border)]/60 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] ${getStatusBadgeClass(template.status)}`}
                        >
                          {getStatusLabel(template.status)}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                          v{template.version}
                        </span>
                      </div>
                      {!template.isDefault && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px] text-[var(--color-muted-foreground)] hover:text-emerald-400"
                          disabled={settingDefaultId === template.id}
                          onClick={() => void handleSetDefault(template)}
                        >
                          {settingDefaultId === template.id ? "Definindo..." : "Tornar padrão"}
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isTrial ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-9 text-xs font-semibold"
                          onClick={() => setTemplateUpgradeModalOpen(true)}
                        >
                          <Lock className="mr-1.5 h-3.5 w-3.5" /> Editar
                        </Button>
                      ) : (
                        <Link href={`/proposals/templates/${template.id}`} className="flex-1">
                          <Button size="sm" className="w-full h-9 text-xs font-semibold">
                            Editar
                          </Button>
                        </Link>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-3 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        disabled={deletingTemplateId === template.id}
                        onClick={() => void handleDeleteTemplate(template)}
                        title="Excluir template"
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
