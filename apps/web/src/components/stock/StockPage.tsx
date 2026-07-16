"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import {
  AlertTriangle,
  Boxes,
  Check,
  Globe,
  Pencil,
  Plus,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import { useOrganization } from "@/components/providers/organization-provider";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import {
  deleteStockItem,
  getStockFreightRules,
  listStock,
  setStockFreightRules,
  type StockFreightRuleRow,
  type StockItemRow,
} from "@/lib/stock-api";
import { StockModal } from "./StockModal";
import { FreightRulesEditor } from "@/components/freight/freight-rules-editor";

const CATEGORY_LABELS: Record<string, string> = {
  module: "Módulo",
  inverter: "Inversor",
  microinverter: "Microinversor",
  structure_kit: "Estrutura",
  dc_cable: "Cabo DC",
  connector: "Conector",
};

function categoryLabel(name: string): string {
  return CATEGORY_LABELS[name] ?? name;
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ExplainerBlock(): JSX.Element {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-4 py-3.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
          <Globe className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          Catálogo global
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-muted-foreground)]">
          Base compartilhada de produtos (módulos, inversores, marcas) mantida pela Energivia. É de
          onde você <strong>escolhe</strong> os produtos — sem quantidade nem preço seu.
        </p>
      </div>
      <div className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-4 py-3.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
          <Warehouse className="h-4 w-4 text-[var(--color-primary)]" />
          Seu estoque próprio
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-muted-foreground)]">
          O que a <strong>sua empresa</strong> realmente tem: você define{" "}
          <strong>quantidade</strong> e <strong>custo unitário</strong>. Na proposta ele funciona
          como uma <strong>distribuidora própria</strong> — o kit sai do seu estoque, com baixa
          automática.
        </p>
      </div>
    </div>
  );
}

function CoverageCard({ items }: { items: StockItemRow[] }): JSX.Element {
  const present = new Set(items.filter((i) => i.availableQuantity > 0).map((i) => i.categoryName));
  const checks = [
    { label: "Módulo", ok: present.has("module") },
    {
      label: "Inversor / microinversor",
      ok: present.has("inverter") || present.has("microinverter"),
    },
    { label: "Estrutura", ok: present.has("structure_kit") },
    { label: "Cabo CC", ok: present.has("dc_cable") },
    { label: "Conector", ok: present.has("connector") },
  ];
  const missing = checks.filter((c) => !c.ok);
  const allOk = missing.length === 0;

  return (
    <div
      className={`rounded-xl border px-4 py-3.5 ${
        allOk
          ? "border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20"
          : "border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
        {allOk ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        )}
        {allOk ? "Seu estoque cobre um kit completo" : "Seu estoque não cobre um kit completo"}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
        {allOk
          ? "Propostas com “Usar meu estoque” serão montadas 100% do seu estoque (sujeito à quantidade)."
          : "Faltam itens obrigatórios abaixo. Propostas com “Usar meu estoque” cairão no catálogo global até você completar o estoque."}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`inline-flex items-center gap-1.5 text-xs ${
              c.ok ? "text-[var(--color-foreground)]" : "text-amber-700 dark:text-amber-300"
            }`}
          >
            {c.ok ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <X className="h-3.5 w-3.5 text-amber-600" />
            )}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StockPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { currentOrganization, currentOrganizationId } = useOrganization();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StockItemRow | null>(null);
  const [snack, setSnack] = useState<{ severity: "success" | "error"; message: string } | null>(
    null
  );

  const canEdit = currentOrganization?.role === "OWNER" || currentOrganization?.role === "ADMIN";

  const query = useQuery({
    queryKey: ["stock", currentOrganizationId],
    queryFn: () => listStock(currentOrganizationId!),
    enabled: Boolean(currentOrganizationId),
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["stock", currentOrganizationId] });
  }, [queryClient, currentOrganizationId]);

  const loadFreight = useCallback(
    () => getStockFreightRules(currentOrganizationId!),
    [currentOrganizationId]
  );
  const saveFreight = useCallback(
    (rules: StockFreightRuleRow[]) => setStockFreightRules(currentOrganizationId!, rules),
    [currentOrganizationId]
  );

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteStockItem(currentOrganizationId!, id),
    onSuccess: () => {
      invalidate();
      setSnack({ severity: "success", message: "Item removido do estoque." });
    },
    onError: (e: Error) => {
      setSnack({ severity: "error", message: e.message || "Não foi possível remover." });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (item: StockItemRow) => {
    setEditing(item);
    setModalOpen(true);
  };
  const handleDelete = (item: StockItemRow) => {
    if (!canEdit) return;
    if (!window.confirm(`Remover “${item.productName}” do seu estoque?`)) return;
    removeMutation.mutate(item.id);
  };

  if (!currentOrganizationId || !currentOrganization) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-[var(--color-muted-foreground)]">Selecione uma organização.</p>
      </div>
    );
  }

  if (query.isLoading) {
    return <LoadingState label="Carregando estoque" />;
  }

  if (query.isError) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-destructive)]">
          {query.error instanceof Error ? query.error.message : "Falha ao carregar."}
        </p>
        <Button type="button" variant="outline" onClick={() => void query.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const items = query.data ?? [];

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
        <p className="mt-1 text-[var(--color-muted-foreground)]">
          Cadastre os produtos que sua empresa tem em estoque, com quantidade e custo. Ao gerar uma
          proposta, você pode montar o kit usando o seu estoque próprio.
        </p>
      </div>

      <ExplainerBlock />

      {!canEdit ? (
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
          Apenas proprietário ou administrador pode alterar o estoque. Você pode consultar a lista
          abaixo.
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/10 px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Boxes className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">Seu estoque está vazio</h2>
          <p className="max-w-md text-sm text-[var(--color-muted-foreground)]">
            Adicione produtos do catálogo global, definindo quantidade e custo. Depois eles ficam
            disponíveis como uma “distribuidora própria” na hora de montar o kit da proposta.
          </p>
          <Button type="button" onClick={openCreate} disabled={!canEdit} className="mt-1">
            <Plus className="mr-1.5 h-4 w-4" />
            Adicionar produto ao estoque
          </Button>
        </div>
      ) : (
        <>
          <CoverageCard items={items} />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={openCreate} disabled={!canEdit}>
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar produto
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/30 text-left text-[var(--color-muted-foreground)]">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 text-right font-medium">Disponível</th>
                  <th className="px-4 py-3 text-right font-medium">Reservado</th>
                  <th className="px-4 py-3 text-right font-medium">Custo unit.</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr
                    key={it.id}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-muted)]/20"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--color-foreground)]">
                        {it.productName}
                      </div>
                      <div className="text-[11px] text-[var(--color-muted-foreground)]">
                        {it.brandName}
                        {it.sku ? ` · SKU ${it.sku}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                      {categoryLabel(it.categoryName)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {it.availableQuantity}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--color-muted-foreground)]">
                      {it.reservedQuantity > 0 ? it.reservedQuantity : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatBRL(it.unitCost)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(it)}
                          disabled={!canEdit}
                          className="rounded-md p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] disabled:opacity-40"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(it)}
                          disabled={!canEdit}
                          className="rounded-md p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/40"
                          aria-label="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <StockModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        organizationId={currentOrganizationId}
        editing={editing}
        onSaved={() => {
          invalidate();
          setSnack({ severity: "success", message: "Estoque atualizado." });
        }}
        onError={(message) => setSnack({ severity: "error", message })}
      />

      <FreightRulesEditor
        title="Frete do meu estoque"
        description="Valor fixo de frete por UF de destino quando o kit da proposta é montado do seu estoque próprio."
        load={loadFreight}
        save={saveFreight}
      />

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={5000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {snack ? (
          <Alert
            onClose={() => setSnack(null)}
            severity={snack.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {snack.message}
          </Alert>
        ) : (
          <span />
        )}
      </Snackbar>
    </div>
  );
}
