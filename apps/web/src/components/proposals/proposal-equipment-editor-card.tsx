"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Cpu,
  Loader2,
  Search,
  Sun,
  Truck,
  Warehouse,
  Zap,
} from "lucide-react";
import {
  getProposalEquipment,
  getProposalItemsAvailability,
  listProposalDistributors,
  listProposalEquipmentOptions,
  listProposalFreightRules,
  updateProposalKitItems,
  type ProposalDistributorAvailability,
  type ProposalEquipmentContext,
  type ProposalEquipmentOption,
} from "@/lib/leads-api";
import { BR_STATES } from "@/lib/br-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";

interface EditableLine {
  productId: string;
  productName: string;
  brandName: string;
  categoryName: string | null;
  quantity: number;
  unitPrice: number;
  unavailable?: boolean;
  changed?: boolean;
}

type LineRole = "module" | "inverter" | "bos";

function roleOf(categoryName: string | null): LineRole {
  if (categoryName === "module") return "module";
  if (categoryName === "inverter" || categoryName === "microinverter") return "inverter";
  return "bos";
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function humanizeCategory(name: string | null | undefined): string {
  if (!name) return "item";
  switch (name) {
    case "module":
      return "módulo";
    case "inverter":
      return "inversor";
    case "microinverter":
      return "microinversor";
    case "structure_kit":
      return "estrutura";
    case "dc_cable":
      return "cabo CC";
    case "connector":
      return "conector";
    default:
      return name;
  }
}

interface ProposalEquipmentEditorCardProps {
  organizationId: string;
  proposalId: string;
  onSaved: (publicToken: string) => void;
}

export function ProposalEquipmentEditorCard({
  organizationId,
  proposalId,
  onSaved,
}: ProposalEquipmentEditorCardProps): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ctx, setCtx] = useState<ProposalEquipmentContext | null>(null);
  const [distributors, setDistributors] = useState<ProposalDistributorAvailability[]>([]);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [distributorId, setDistributorId] = useState<string | null>(null);
  const [distributorSwitchLoading, setDistributorSwitchLoading] = useState(false);
  const [distributorSwitchError, setDistributorSwitchError] = useState<string | null>(null);

  const [freightState, setFreightState] = useState<string>("");
  const [freightRules, setFreightRules] = useState<Record<string, number>>({});
  const [freightLoading, setFreightLoading] = useState(false);

  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});
  const [moduleQtyOverrides, setModuleQtyOverrides] = useState<Record<string, number>>({});
  const [qtyResetNotice, setQtyResetNotice] = useState(false);

  const [swapTargetIndex, setSwapTargetIndex] = useState<number | null>(null);
  const [swapSearch, setSwapSearch] = useState("");
  const [swapOptions, setSwapOptions] = useState<ProposalEquipmentOption[]>([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setSwapTargetIndex(null);
    setSaveError(null);
    setDistributorSwitchError(null);
    try {
      const [data, dists] = await Promise.all([
        getProposalEquipment(organizationId, proposalId),
        listProposalDistributors(organizationId, proposalId),
      ]);
      setCtx(data);
      setDistributors(dists);
      setLines(
        data.items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          brandName: i.brandName,
          categoryName: i.categoryName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          unavailable: false,
          changed: false,
        }))
      );
      setDistributorId(data.distributorId);
      setFreightState(data.freightState ?? "");
      setQtyDrafts({});
      setModuleQtyOverrides({});
      setQtyResetNotice(false);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Não foi possível carregar os equipamentos.");
    } finally {
      setLoading(false);
    }
  }, [organizationId, proposalId]);

  useEffect(() => {
    void load();
  }, [load]);

  const effectiveQty = useCallback(
    (line: EditableLine): number => {
      const role = roleOf(line.categoryName);
      if (role === "module") {
        return moduleQtyOverrides[line.productId] ?? line.quantity;
      }
      if (role === "inverter") return line.quantity;
      const raw = qtyDrafts[line.productId];
      if (raw == null) return line.quantity;
      const parsed = parseInt(raw, 10);
      return Number.isFinite(parsed) && parsed >= 1 ? parsed : line.quantity;
    },
    [moduleQtyOverrides, qtyDrafts]
  );

  useEffect(() => {
    if (!distributorId) {
      setFreightRules({});
      return;
    }
    let cancelled = false;
    setFreightLoading(true);
    listProposalFreightRules(organizationId, proposalId, distributorId)
      .then((rows) => {
        if (!cancelled) setFreightRules(Object.fromEntries(rows.map((r) => [r.state, r.value])));
      })
      .catch(() => {
        if (!cancelled) setFreightRules({});
      })
      .finally(() => {
        if (!cancelled) setFreightLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [distributorId, organizationId, proposalId]);

  const swapLine = swapTargetIndex != null ? (lines[swapTargetIndex] ?? null) : null;
  const swapCategory = swapLine?.categoryName ?? null;

  useEffect(() => {
    if (swapTargetIndex == null || !distributorId || !swapCategory) {
      setSwapOptions([]);
      return;
    }
    let cancelled = false;
    setSwapLoading(true);
    setSwapError(null);
    listProposalEquipmentOptions(organizationId, proposalId, {
      distributorId,
      categoryName: swapCategory,
      search: swapSearch.trim() || undefined,
    })
      .then((rows) => {
        if (!cancelled) setSwapOptions(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setSwapError(e instanceof Error ? e.message : "Falha ao carregar produtos.");
      })
      .finally(() => {
        if (!cancelled) setSwapLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [swapTargetIndex, distributorId, swapCategory, swapSearch, organizationId, proposalId]);

  const subtotal = useMemo(
    () =>
      Math.round(
        lines
          .filter((l) => !l.unavailable)
          .reduce((acc, l) => acc + effectiveQty(l) * l.unitPrice, 0) * 100
      ) / 100,
    [lines, effectiveQty]
  );

  const unavailableCount = lines.filter((l) => l.unavailable).length;

  const hasQtyAdjustments = useMemo(
    () =>
      Object.keys(moduleQtyOverrides).length > 0 ||
      lines.some((l) => {
        if (roleOf(l.categoryName) !== "bos") return false;
        const raw = qtyDrafts[l.productId];
        return raw != null && effectiveQty(l) !== l.quantity;
      }),
    [lines, moduleQtyOverrides, qtyDrafts, effectiveQty]
  );

  const dirty =
    Boolean(ctx) &&
    (distributorId !== ctx?.distributorId ||
      lines.some((l) => l.changed) ||
      hasQtyAdjustments ||
      freightState !== (ctx?.freightState ?? ""));

  const freightPreviewBrl = freightState ? (freightRules[freightState] ?? 0) : 0;
  const freightHasRule = freightState ? freightRules[freightState] != null : false;

  const moduleLineIndex = lines.findIndex((l) => roleOf(l.categoryName) === "module");
  const inverterLineIndex = lines.findIndex((l) => roleOf(l.categoryName) === "inverter");
  const moduleLine = moduleLineIndex >= 0 ? lines[moduleLineIndex]! : null;
  const inverterLine = inverterLineIndex >= 0 ? lines[inverterLineIndex]! : null;

  const displayPowerKw = (() => {
    const base = ctx?.systemPowerKw ?? null;
    if (base == null || base <= 0) return null;
    if (!moduleLine || moduleLine.quantity <= 0) return base;
    const perModuleKw = base / moduleLine.quantity;
    return Math.round(perModuleKw * effectiveQty(moduleLine) * 100) / 100;
  })();

  async function changeDistributor(nextId: string): Promise<void> {
    if (!nextId || nextId === distributorId) return;
    setDistributorSwitchError(null);
    setDistributorSwitchLoading(true);
    setSwapTargetIndex(null);
    try {
      const availability = await getProposalItemsAvailability(organizationId, proposalId, nextId);
      const availabilityByProduct = new Map(availability.rows.map((r) => [r.productId, r]));
      setLines((prev) =>
        prev.map((l) => {
          const row = availabilityByProduct.get(l.productId);
          if (!row) return { ...l, unavailable: true };
          if (row.available && row.unitPrice != null) {
            return {
              ...l,
              unavailable: false,
              unitPrice: row.unitPrice,
              changed: row.unitPrice !== l.unitPrice ? true : l.changed,
            };
          }
          return { ...l, unavailable: true };
        })
      );
      if (Object.keys(qtyDrafts).length > 0 || Object.keys(moduleQtyOverrides).length > 0) {
        setQtyDrafts({});
        setModuleQtyOverrides({});
        setQtyResetNotice(true);
      }
      setDistributorId(nextId);
    } catch (e) {
      setDistributorSwitchError(
        e instanceof Error ? e.message : "Não foi possível trocar o distribuidor."
      );
    } finally {
      setDistributorSwitchLoading(false);
    }
  }

  function adjustModuleQuantity(line: EditableLine, delta: number): void {
    setQtyResetNotice(false);
    setModuleQtyOverrides((prev) => {
      const current = prev[line.productId] ?? line.quantity;
      const next = Math.max(1, current + delta);
      if (next === line.quantity) {
        const clone = { ...prev };
        delete clone[line.productId];
        return clone;
      }
      return { ...prev, [line.productId]: next };
    });
  }

  function applySwap(option: ProposalEquipmentOption): void {
    if (swapTargetIndex == null) return;
    const previous = lines[swapTargetIndex];
    setLines((prev) =>
      prev.map((l, i) =>
        i === swapTargetIndex
          ? {
              ...l,
              productId: option.productId,
              productName: option.productName,
              brandName: option.brandName,
              categoryName: option.categoryName,
              unitPrice: option.unitPrice,
              unavailable: false,
              changed: true,
            }
          : l
      )
    );
    if (previous) {
      setQtyDrafts((prev) => {
        const clone = { ...prev };
        delete clone[previous.productId];
        return clone;
      });
      setModuleQtyOverrides((prev) => {
        const clone = { ...prev };
        delete clone[previous.productId];
        return clone;
      });
    }
    setSwapTargetIndex(null);
    setSwapSearch("");
  }

  function removeLine(index: number): void {
    setLines((prev) => prev.filter((_, i) => i !== index));
    setSwapTargetIndex(null);
  }

  async function save(): Promise<void> {
    if (!distributorId) {
      setSaveError("Selecione um distribuidor antes de salvar.");
      return;
    }
    if (lines.length === 0) {
      setSaveError("Mantenha ao menos um equipamento na lista.");
      return;
    }
    if (lines.some((l) => l.unavailable)) {
      setSaveError(
        `Existem ${unavailableCount} item(ns) sem oferta no distribuidor selecionado — substitua ou remova antes de salvar.`
      );
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      const result = await updateProposalKitItems(organizationId, proposalId, {
        distributorId,
        items: lines.map((l) => ({ productId: l.productId, quantity: effectiveQty(l) })),
        freightState: freightState || null,
      });
      await load();
      onSaved(result.publicToken);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  function renderSwapPanel(line: EditableLine): JSX.Element {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/10">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3.5 py-2.5">
          <p className="text-xs font-medium text-[var(--color-foreground)]">
            {line.unavailable ? "Substituir" : "Trocar"} {humanizeCategory(line.categoryName)} —
            produtos deste distribuidor
          </p>
          <button
            type="button"
            className="text-xs text-[var(--color-muted-foreground)] hover:underline"
            onClick={() => setSwapTargetIndex(null)}
          >
            Fechar
          </button>
        </div>
        <div className="space-y-2 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
            <Input
              type="search"
              value={swapSearch}
              onChange={(e) => setSwapSearch(e.target.value)}
              placeholder="Buscar por nome do produto"
              className="h-9 pl-9"
            />
          </div>
          {swapError ? <p className="text-xs text-red-600 dark:text-red-400">{swapError}</p> : null}
          {swapLoading ? (
            <p className="flex items-center gap-2 py-2 text-xs text-[var(--color-muted-foreground)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Buscando produtos…
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--color-border)]">
              {swapOptions.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-[var(--color-muted-foreground)]">
                  Nenhum produto encontrado nessa categoria neste distribuidor.
                </p>
              ) : (
                swapOptions.map((opt) => {
                  const isCurrent = opt.productId === line.productId && !line.unavailable;
                  const qty = effectiveQty(line);
                  const currentLineTotal = qty * line.unitPrice;
                  const optionLineTotal = qty * opt.unitPrice;
                  const delta = line.unavailable ? null : optionLineTotal - currentLineTotal;
                  return (
                    <button
                      key={opt.productId}
                      type="button"
                      disabled={isCurrent}
                      className={`flex w-full items-center gap-2.5 border-b border-[var(--color-border)]/60 px-3.5 py-2.5 text-left last:border-0 ${
                        isCurrent
                          ? "bg-emerald-500/[0.06]"
                          : "transition-colors hover:bg-emerald-500/[0.04]"
                      }`}
                      onClick={() => applySwap(opt)}
                    >
                      {isCurrent ? (
                        <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border border-[var(--color-border)]"
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-[var(--color-foreground)]">
                          {opt.brandName} {opt.productName}
                          {isCurrent ? (
                            <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700 dark:text-emerald-300">
                              atual
                            </span>
                          ) : null}
                        </span>
                        <span className="block text-xs text-[var(--color-muted-foreground)]">
                          {qty}× {formatBRL(opt.unitPrice)} · estoque: {opt.stockQuantity}
                        </span>
                      </span>
                      {!isCurrent && delta != null && delta !== 0 ? (
                        <span
                          className={`shrink-0 text-xs font-semibold tabular-nums ${
                            delta < 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {delta > 0 ? "+" : "−"} {formatBRL(Math.abs(delta))}
                        </span>
                      ) : !isCurrent && delta === 0 ? (
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--color-muted-foreground)]">
                          mesmo total
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Equipamentos do kit"
      className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-[var(--color-card)]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"
        aria-hidden
      />
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-emerald-600/90 dark:text-emerald-400/90">
              Equipamentos
            </p>
            <h2 className="mt-0.5 flex items-center gap-2 text-base font-semibold text-[var(--color-foreground)]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400/25 to-amber-600/10 text-amber-600 dark:text-amber-400">
                <Zap className="h-4 w-4" />
              </span>
              Kit da proposta
            </h2>
            <p className="mt-1 max-w-xl text-xs text-[var(--color-muted-foreground)]">
              Troque distribuidor, itens ou quantidades. Ao salvar, o valor comercial é recalculado
              e um <span className="font-medium">novo link público</span> é gerado — o anterior
              deixa de funcionar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirty ? (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Alterações não salvas
              </span>
            ) : null}
            {ctx?.sourceType === "own_stock" && !dirty ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                <Warehouse className="h-3 w-3" />
                Meu estoque
              </span>
            ) : ctx ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                {distributors.find((d) => d.id === distributorId)?.name ??
                  ctx.distributorName ??
                  "Distribuidor"}
              </span>
            ) : null}
          </div>
        </div>

        {loading ? (
          <LoadingState label="Carregando equipamentos" compact />
        ) : loadError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : !ctx ? null : (
          <>
            {ctx.sourceType === "own_stock" && !dirty ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                <Warehouse className="h-4 w-4" />
                Origem atual: Meu estoque — kit montado 100% do seu estoque próprio. Trocar para um
                distribuidor abaixo reprecifica o kit inteiro.
              </div>
            ) : null}
            <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3.5 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  Distribuidor do kit
                </p>
                <p className="mt-0.5 text-xs leading-snug text-[var(--color-muted-foreground)]">
                  Todos os equipamentos vêm de um único distribuidor — trocar reprecifica o kit
                  inteiro; itens sem oferta ficam marcados para substituição.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {distributors.map((d) => {
                  const selected = d.id === distributorId;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      disabled={distributorSwitchLoading}
                      title={
                        d.hasAllItems
                          ? `${d.name}: todos os ${d.totalCount} itens disponíveis`
                          : `${d.name}: ${d.matchedCount} de ${d.totalCount} itens — os demais precisam ser substituídos`
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${
                        selected
                          ? "border-emerald-500 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300"
                          : "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] hover:border-emerald-300"
                      } ${distributorSwitchLoading ? "opacity-60" : ""}`}
                      onClick={() => void changeDistributor(d.id)}
                    >
                      {d.name}
                      {d.hasAllItems && d.total != null ? (
                        <span className="text-xs font-normal text-[var(--color-muted-foreground)]">
                          {formatBRL(d.total)}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700 dark:text-amber-300">
                          {d.matchedCount}/{d.totalCount} itens
                        </span>
                      )}
                    </button>
                  );
                })}
                {distributorSwitchLoading ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Reprecificando…
                  </span>
                ) : null}
              </div>
              {distributorSwitchError ? (
                <p className="text-xs text-red-600 dark:text-red-400">{distributorSwitchError}</p>
              ) : null}
              {unavailableCount > 0 ? (
                <p className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4" />
                  {unavailableCount} item(ns) sem oferta neste distribuidor — substitua ou remova
                  antes de salvar.
                </p>
              ) : null}
            </div>

            {displayPowerKw != null ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-baseline gap-2 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/12 to-emerald-600/5 px-4 py-2.5">
                  <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Potência dimensionada
                  </span>
                  <span className="text-xl font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-300">
                    {displayPowerKw.toLocaleString("pt-BR", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-base font-semibold">kWp</span>
                  </span>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {moduleLine ? (
                <div className="flex gap-3 rounded-xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-background)] to-emerald-500/[0.04] p-3 shadow-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Sun className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      Módulos
                    </p>
                    <p className="text-sm font-semibold leading-snug text-[var(--color-foreground)]">
                      <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                        {effectiveQty(moduleLine)}×
                      </span>{" "}
                      {moduleLine.brandName} {moduleLine.productName}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 shrink-0 self-center rounded-lg px-3 text-xs"
                    disabled={!distributorId}
                    onClick={() => {
                      setSwapSearch("");
                      setSwapTargetIndex((cur) =>
                        cur === moduleLineIndex ? null : moduleLineIndex
                      );
                    }}
                  >
                    {swapTargetIndex === moduleLineIndex ? "Fechar" : "Trocar"}
                  </Button>
                </div>
              ) : null}
              {inverterLine ? (
                <div className="flex gap-3 rounded-xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-background)] to-violet-500/[0.04] p-3 shadow-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      Inversor
                    </p>
                    <p className="text-sm font-semibold leading-snug text-[var(--color-foreground)]">
                      <span className="tabular-nums text-violet-600 dark:text-violet-400">
                        {inverterLine.quantity}×
                      </span>{" "}
                      {inverterLine.brandName} {inverterLine.productName}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 shrink-0 self-center rounded-lg px-3 text-xs"
                    disabled={!distributorId}
                    onClick={() => {
                      setSwapSearch("");
                      setSwapTargetIndex((cur) =>
                        cur === inverterLineIndex ? null : inverterLineIndex
                      );
                    }}
                  >
                    {swapTargetIndex === inverterLineIndex ? "Fechar" : "Trocar"}
                  </Button>
                </div>
              ) : null}
            </div>

            {swapLine ? renderSwapPanel(swapLine) : null}

            <div className="overflow-hidden rounded-xl border border-[var(--color-border)] shadow-sm">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-muted)]/50 to-[var(--color-muted)]/20">
                    <th className="p-3 text-left text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      Item
                    </th>
                    <th className="p-3 text-left text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      Marca
                    </th>
                    <th className="p-3 text-right text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      Qtd
                    </th>
                    <th className="hidden p-3 text-right text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)] sm:table-cell">
                      Un.
                    </th>
                    <th className="p-3 text-right text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const role = roleOf(line.categoryName);
                    const qty = effectiveQty(line);
                    const raw = qtyDrafts[line.productId];
                    const isAdjusted =
                      role === "module"
                        ? moduleQtyOverrides[line.productId] != null
                        : role === "bos" && raw != null && qty !== line.quantity;
                    const belowCalculated = isAdjusted && qty < line.quantity;
                    return (
                      <Fragment key={`${line.productId}-${idx}`}>
                        <tr
                          className={`border-b border-[var(--color-border)]/80 transition-colors last:border-0 hover:bg-emerald-500/[0.04] ${
                            line.unavailable
                              ? "bg-red-500/5"
                              : idx % 2 === 1
                                ? "bg-[var(--color-muted)]/15"
                                : ""
                          }`}
                        >
                          <td className="p-3 font-medium text-[var(--color-foreground)]">
                            {line.productName}
                            {line.unavailable ? (
                              <span className="mt-0.5 block text-[0.7rem] font-normal">
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700 dark:text-red-300">
                                  <AlertTriangle className="h-3 w-3" />
                                  Indisponível neste distribuidor
                                </span>{" "}
                                <button
                                  type="button"
                                  className="text-red-700 underline-offset-2 hover:underline dark:text-red-300"
                                  onClick={() => {
                                    setSwapSearch("");
                                    setSwapTargetIndex(idx);
                                  }}
                                >
                                  substituir
                                </button>
                                {" · "}
                                <button
                                  type="button"
                                  className="text-[var(--color-muted-foreground)] underline-offset-2 hover:underline"
                                  onClick={() => removeLine(idx)}
                                >
                                  remover
                                </button>
                              </span>
                            ) : isAdjusted ? (
                              <span className="mt-0.5 block text-[0.7rem] font-normal text-[var(--color-muted-foreground)]">
                                calculado: {line.quantity}
                                {" · "}
                                <button
                                  type="button"
                                  className="text-emerald-700 hover:underline dark:text-emerald-300"
                                  onClick={() => {
                                    if (role === "module") {
                                      setModuleQtyOverrides((prev) => {
                                        const clone = { ...prev };
                                        delete clone[line.productId];
                                        return clone;
                                      });
                                    } else {
                                      setQtyDrafts((prev) => {
                                        const clone = { ...prev };
                                        delete clone[line.productId];
                                        return clone;
                                      });
                                    }
                                  }}
                                >
                                  restaurar
                                </button>
                                {belowCalculated ? (
                                  <span className="text-amber-700 dark:text-amber-300">
                                    {" "}
                                    · abaixo do calculado
                                  </span>
                                ) : null}
                              </span>
                            ) : null}
                          </td>
                          <td className="p-3 text-[var(--color-muted-foreground)]">
                            {line.brandName}
                          </td>
                          <td className="p-3 text-right tabular-nums text-[var(--color-foreground)]">
                            {line.unavailable ? (
                              <span>{qty}</span>
                            ) : role === "module" ? (
                              <span className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  aria-label="Um módulo a menos"
                                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] text-sm leading-none hover:border-emerald-400"
                                  onClick={() => adjustModuleQuantity(line, -1)}
                                >
                                  −
                                </button>
                                <span className="min-w-[2ch] text-center">{qty}</span>
                                <button
                                  type="button"
                                  aria-label="Um módulo a mais"
                                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] text-sm leading-none hover:border-emerald-400"
                                  onClick={() => adjustModuleQuantity(line, 1)}
                                >
                                  +
                                </button>
                              </span>
                            ) : role === "inverter" ? (
                              <span
                                title="Quantidade definida pelo dimensionamento do kit"
                                className="cursor-help underline decoration-dotted underline-offset-2"
                              >
                                {qty}
                              </span>
                            ) : (
                              <input
                                type="number"
                                min={1}
                                inputMode="numeric"
                                aria-label={`Quantidade de ${line.productName}`}
                                className={`h-7 w-16 rounded-md border bg-[var(--color-background)] px-1.5 text-right tabular-nums outline-none focus:border-emerald-400 ${
                                  belowCalculated
                                    ? "border-amber-500/60"
                                    : "border-[var(--color-border)]"
                                }`}
                                value={raw ?? String(line.quantity)}
                                onChange={(e) => {
                                  setQtyResetNotice(false);
                                  const value = e.target.value;
                                  setQtyDrafts((prev) =>
                                    value === String(line.quantity)
                                      ? (() => {
                                          const clone = { ...prev };
                                          delete clone[line.productId];
                                          return clone;
                                        })()
                                      : { ...prev, [line.productId]: value }
                                  );
                                }}
                              />
                            )}
                          </td>
                          <td className="hidden p-3 text-right tabular-nums text-[var(--color-muted-foreground)] sm:table-cell">
                            {line.unavailable ? "—" : formatBRL(line.unitPrice)}
                          </td>
                          <td className="p-3 text-right font-medium tabular-nums text-[var(--color-foreground)]">
                            {line.unavailable ? (
                              <span className="text-red-600 dark:text-red-400">—</span>
                            ) : (
                              formatBRL(Math.round(qty * line.unitPrice * 100) / 100)
                            )}
                          </td>
                        </tr>
                        {swapTargetIndex === idx && role === "bos" ? (
                          <tr className="bg-[var(--color-muted)]/15">
                            <td colSpan={5} className="p-3">
                              {renderSwapPanel(line)}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                  {lines.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-sm text-[var(--color-muted-foreground)]"
                      >
                        Nenhum equipamento na lista.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--color-border)] bg-[var(--color-muted)]/30">
                    <td
                      colSpan={3}
                      className="p-3 text-right text-xs font-medium text-[var(--color-muted-foreground)]"
                    >
                      Total dos equipamentos
                    </td>
                    <td className="hidden p-3 sm:table-cell" />
                    <td className="p-3 text-right text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
                      {formatBRL(subtotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3.5 py-3">
              <div className="flex items-start gap-2.5">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--color-foreground)]">
                    Frete{" "}
                    {freightLoading ? (
                      <Loader2 className="ml-1 inline h-3.5 w-3.5 animate-spin text-[var(--color-muted-foreground)]" />
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-[var(--color-muted-foreground)]">
                    Regra por UF de destino da distribuidora — entra no valor final da proposta.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={freightState}
                  aria-label="UF de destino do frete"
                  onChange={(e) => setFreightState(e.target.value)}
                  className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 text-sm text-[var(--color-foreground)]"
                >
                  <option value="">Sem frete</option>
                  {BR_STATES.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
                {freightState ? (
                  freightHasRule ? (
                    <span className="text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
                      {formatBRL(freightPreviewBrl)}
                    </span>
                  ) : (
                    <span
                      className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
                      title="Cadastre a regra de frete desta distribuidora para esta UF"
                    >
                      sem regra para {freightState} — R$ 0,00
                    </span>
                  )
                ) : (
                  <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                )}
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  Equipamentos + frete:{" "}
                  <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                    {formatBRL(Math.round((subtotal + freightPreviewBrl) * 100) / 100)}
                  </span>
                </span>
              </div>
            </div>

            {qtyResetNotice ? (
              <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                O kit foi reprecificado e os ajustes manuais de quantidade foram redefinidos para os
                valores calculados.
              </p>
            ) : null}

            {saveError ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {saveError}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Salvar recalcula custos e margem pelas regras da empresa e{" "}
                <span className="font-medium">invalida o link público anterior</span>.
              </p>
              <Button
                type="button"
                onClick={() => void save()}
                disabled={
                  saving ||
                  !dirty ||
                  lines.length === 0 ||
                  !distributorId ||
                  unavailableCount > 0 ||
                  distributorSwitchLoading
                }
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Salvar e gerar novo link
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
