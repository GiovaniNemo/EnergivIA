"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  FilePenLine,
  Trash2,
  LayoutTemplate,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
} from "lucide-react";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  adminListTemplateBlueprints,
  adminDeleteTemplateBlueprint,
  type TemplateBlueprintAdminRow,
} from "@/lib/template-blueprints-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function BlueprintCardPreview({
  thumbnailUrl,
  title,
}: {
  thumbnailUrl?: string | null;
  title: string;
}): JSX.Element {
  const [imageError, setImageError] = useState(false);

  if (thumbnailUrl && !imageError) {
    return (
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
        <img
          src={thumbnailUrl}
          alt={`Preview do modelo ${title}`}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-card)] via-transparent to-black/35" />
      </div>
    );
  }

  // Fallback elegante com blueprint vetorial
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/40 p-5 flex flex-col justify-between">
      {/* Grid blueprint de fundo */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: "radial-gradient(#10b981 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
          <LayoutTemplate className="w-3 h-3" />
          <span>Blueprint</span>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500/40" />
          <div className="w-2 h-2 rounded-full bg-amber-500/40" />
          <div className="w-2 h-2 rounded-full bg-blue-500/40" />
        </div>
      </div>

      <div className="relative z-10 space-y-2">
        <div className="h-2 w-3/4 rounded bg-white/20" />
        <div className="h-1.5 w-1/2 rounded bg-white/10" />
        <div className="h-1.5 w-2/3 rounded bg-white/10" />
      </div>

      <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/5">
        <div className="h-4 w-16 rounded bg-emerald-500/20" />
        <span className="text-[10px] text-zinc-500 font-mono">EnergivIA Doc</span>
      </div>
    </div>
  );
}

export default function AdminTemplateModelsPage(): JSX.Element {
  const { currentOrganizationId } = useOrganization();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");
  const [deletingBlueprint, setDeletingBlueprint] = useState<TemplateBlueprintAdminRow | null>(
    null
  );

  const {
    data: rows = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "template-blueprints", currentOrganizationId],
    queryFn: () => adminListTemplateBlueprints(currentOrganizationId!),
    enabled: Boolean(currentOrganizationId),
  });

  const deleteMutation = useMutation({
    mutationFn: (rowId: string) => adminDeleteTemplateBlueprint(currentOrganizationId!, rowId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "template-blueprints", currentOrganizationId],
      });
      setDeletingBlueprint(null);
    },
  });

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.description && row.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (row.slug && row.slug.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === "PUBLISHED") return row.published;
      if (statusFilter === "DRAFT") return !row.published;
      return true;
    });
  }, [rows, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const published = rows.filter((r) => r.published).length;
    const drafts = total - published;
    return { total, published, drafts };
  }, [rows]);

  if (!currentOrganizationId) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-200">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-400" />
          <p className="text-sm">
            Selecione uma organização no menu superior para gerenciar os modelos de template de
            proposta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <LayoutTemplate className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Total de Modelos
            </p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Publicados no Catálogo
            </p>
            <p className="text-2xl font-bold text-emerald-400">{stats.published}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Rascunhos / Privados
            </p>
            <p className="text-2xl font-bold text-zinc-300">{stats.drafts}</p>
          </div>
        </div>
      </div>

      {/* Action Bar (Search + Filter Pills + New Model Button) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar modelos por nome, slug ou tema..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 transition-colors focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === "ALL"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Todos ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter("PUBLISHED")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === "PUBLISHED"
                  ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Publicados ({stats.published})
            </button>
            <button
              onClick={() => setStatusFilter("DRAFT")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === "DRAFT"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Rascunhos ({stats.drafts})
            </button>
          </div>
        </div>

        {/* Primary CTA */}
        <Link
          href="/admin/modelos-template/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-950 transition-all hover:bg-emerald-500 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Modelo</span>
        </Link>
      </div>

      {/* Error alert */}
      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error instanceof Error ? error.message : "Falha ao carregar os modelos de template."}
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]"
            >
              <div className="aspect-[16/10] bg-zinc-800/60" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-3/4 rounded bg-zinc-800" />
                <div className="h-4 w-full rounded bg-zinc-800/50" />
                <div className="h-4 w-1/2 rounded bg-zinc-800/30" />
                <div className="pt-2 flex justify-between">
                  <div className="h-8 w-24 rounded bg-zinc-800" />
                  <div className="h-8 w-8 rounded bg-zinc-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredRows.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/40 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 mb-4">
            <LayoutTemplate className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-white">Nenhum modelo encontrado</h3>
          <p className="mt-1 text-sm text-zinc-400 max-w-sm">
            {searchTerm
              ? "Tente buscar por outro termo ou limpe o filtro de busca."
              : "Não há modelos cadastrados nesta categoria. Crie um novo modelo para disponibilizar no catálogo."}
          </p>
          <Link
            href="/admin/modelos-template/new"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Criar modelo agora</span>
          </Link>
        </div>
      ) : (
        /* Visual Cards Grid */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRows.map((row) => (
            <div
              key={row.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] transition-all duration-300 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-black/20"
            >
              {/* Visual Banner 16:10 */}
              <div className="relative">
                <BlueprintCardPreview thumbnailUrl={row.thumbnailUrl} title={row.name} />

                {/* Status Badge */}
                <div className="absolute top-3 left-3 z-10">
                  {row.published ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/80 px-2.5 py-1 text-xs font-medium text-emerald-300 backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Publicado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-600/50 bg-zinc-900/80 px-2.5 py-1 text-xs font-medium text-zinc-300 backdrop-blur-md">
                      <Clock className="h-3 w-3 text-zinc-400" />
                      Rascunho
                    </span>
                  )}
                </div>

                {/* Sort Order Badge */}
                <div className="absolute top-3 right-3 z-10">
                  <span className="inline-flex items-center rounded-lg border border-white/10 bg-black/60 px-2 py-0.5 text-[11px] font-mono font-medium text-zinc-300 backdrop-blur-md">
                    Ordem: #{row.sortOrder}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <h3
                    className="text-base font-bold text-white transition-colors group-hover:text-emerald-300 line-clamp-1"
                    title={row.name}
                  >
                    {row.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2 min-h-[2rem]">
                    {row.description ||
                      "Template oficial da plataforma EnergivIA para propostas solares profissionais."}
                  </p>

                  {/* Slug tag */}
                  {row.slug && (
                    <div className="mt-3">
                      <span className="inline-block rounded-md bg-zinc-800/80 px-2 py-0.5 text-[11px] font-mono text-zinc-400 border border-zinc-700/50">
                        {row.slug}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border)]/60 pt-4">
                  <Link
                    href={`/admin/modelos-template/${row.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800/90 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-500/30 border border-transparent"
                  >
                    <FilePenLine className="h-3.5 w-3.5" />
                    <span>Editar modelo</span>
                  </Link>

                  <button
                    onClick={() => setDeletingBlueprint(row)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-500/15 hover:text-red-400"
                    title="Excluir modelo"
                    aria-label={`Excluir modelo ${row.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Delete */}
      <Dialog
        open={Boolean(deletingBlueprint)}
        onOpenChange={(open) => !open && setDeletingBlueprint(null)}
      >
        <DialogContent className="max-w-md bg-[var(--color-card)] text-white border-[var(--color-border)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400 text-lg">
              <Trash2 className="h-5 w-5" />
              <span>Confirmar Exclusão</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm mt-2">
              Deseja realmente excluir o modelo{" "}
              <strong className="text-white">"{deletingBlueprint?.name}"</strong>? Esta ação
              removerá o blueprint do catálogo e não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>

          {deleteMutation.isError && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : "Falha ao excluir o modelo."}
            </div>
          )}

          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setDeletingBlueprint(null)}
              disabled={deleteMutation.isPending}
              className="rounded-xl border border-[var(--color-border)] bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => deletingBlueprint && deleteMutation.mutate(deletingBlueprint.id)}
              disabled={deleteMutation.isPending}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Sim, excluir"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
