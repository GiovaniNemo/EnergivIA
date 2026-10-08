"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Cpu,
  Loader2,
  Search,
  Calculator,
  Sun,
  Warehouse,
  Zap,
} from "lucide-react";
import {
  getProposalEquipment,
  listProposalEquipmentOptions,
  updateProposalKitItems,
  type ProposalEquipmentContext,
  type ProposalEquipmentOption,
} from "@/lib/leads-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import {
  generateDistributorTiers,
  generateKitWhatsAppPreview,
  type GenerateKitRequest,
  type GenerateKitResult,
} from "@/lib/kit-api";
import { fetchDistributorProducts, fetchProducts } from "@/lib/admin-api";

type RoofType = "ceramic" | "metal" | "fibromadeira" | "fibrometal" | "ground" | "laje" | "none";

const ROOF_TYPE_SELECT_OPTIONS: { value: RoofType; label: string }[] = [
  { value: "fibromadeira", label: "Fibromadeira" },
  { value: "ceramic", label: "Colonial / cerâmico" },
  { value: "metal", label: "Metálico (mini trilho)" },
  { value: "fibrometal", label: "Fibrometal (autobrocante)" },
  { value: "ground", label: "Solo" },
  { value: "laje", label: "Laje" },
  { value: "none", label: "Sem estrutura" },
];

const POPULAR_MODULE_BRANDS = [
  "LONGi Solar",
  "Canadian Solar",
  "Jinko Solar",
  "JA Solar",
  "Trina Solar",
  "Astronergy",
  "DAH Solar",
  "Risen Energy",
];

interface KitDraftState {
  systemKw: string;
  roof: RoofType;
  brandPreset: string;
  brandCustom: string;
  inverterType: "string" | "microinverter" | "hybrid" | "off_grid";
  targetInverterQty: "auto" | "1" | "2" | "3" | "4";
  gridTopology: "auto" | "mono_220" | "biphasic_127_220" | "tri_220" | "tri_380";
  stringBoxId: string;
}

function categorizeKitItem(
  it: { product_id: string; product_name: string },
  result: GenerateKitResult
): string {
  if (it.product_id === result.modules?.product_id) return "module";
  if (it.product_id === result.inverter?.product_id) {
    return result.inverter.product_name.toLowerCase().includes("micro")
      ? "microinverter"
      : "inverter";
  }
  const name = it.product_name.toLowerCase();
  if (
    name.includes("estrutura") ||
    name.includes("perfil") ||
    name.includes("trilho") ||
    name.includes("grampo")
  ) {
    return "structure_kit";
  }
  if (name.includes("cabo")) return "dc_cable";
  if (name.includes("conector") || name.includes("mc4")) return "connector";
  if (name.includes("string box")) return "string_box";
  return "bos";
}

interface EditableLine {
  productId: string;
  productName: string;
  brandName: string;
  categoryName: string | null;
  quantity: number;
  unitPrice: number;
  unavailable?: boolean;
  changed?: boolean;
  specs?: Record<string, unknown> | null;
}

type LineRole = "module" | "inverter" | "locked_bos" | "bos";

function roleOf(categoryName: string | null): LineRole {
  if (categoryName === "module") return "module";
  if (categoryName === "inverter" || categoryName === "microinverter") return "inverter";
  if (categoryName === "structure_kit" || categoryName === "profile") return "locked_bos";
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
    case "string_box":
      return "string box";
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
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [distributorId, setDistributorId] = useState<string | null>(null);
  const [freightState, setFreightState] = useState<string>("");

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

  const [kitDraft, setKitDraft] = useState<KitDraftState>({
    systemKw: "9.75",
    roof: "fibromadeira",
    brandPreset: "",
    brandCustom: "",
    inverterType: "string",
    targetInverterQty: "auto",
    gridTopology: "auto",
    stringBoxId: "none",
  });
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [kitRecalcError, setKitRecalcError] = useState<string | null>(null);
  const [stringBoxOptions, setStringBoxOptions] = useState<Array<{ id: string; name: string }>>([]);
  const hasUserEditedKitSpecs = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setSwapTargetIndex(null);
    setSaveError(null);
    try {
      const data = await getProposalEquipment(organizationId, proposalId);
      setCtx(data);
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          specs: (i as any).specs ?? null,
        }))
      );
      const distId = data.distributorId || data.alternateDistributors?.[0]?.id || null;
      setDistributorId(distId);
      setFreightState(data.freightState ?? "");
      setQtyDrafts({});
      setModuleQtyOverrides({});
      setQtyResetNotice(false);

      let initialRoof: RoofType = "fibromadeira";
      const structItem = data.items.find(
        (i) =>
          i.categoryName === "structure_kit" || i.productName.toLowerCase().includes("estrutura")
      );
      if (structItem) {
        const sName = structItem.productName.toLowerCase();
        if (
          sName.includes("cerâmica") ||
          sName.includes("colonial") ||
          sName.includes("ceramico")
        ) {
          initialRoof = "ceramic";
        } else if (
          sName.includes("metálico") ||
          sName.includes("metalico") ||
          sName.includes("trapezoidal")
        ) {
          initialRoof = "metal";
        } else if (sName.includes("fibromadeira") || sName.includes("ondulada")) {
          initialRoof = "fibromadeira";
        } else if (sName.includes("fibrometal")) {
          initialRoof = "fibrometal";
        } else if (sName.includes("solo")) {
          initialRoof = "ground";
        } else if (sName.includes("laje")) {
          initialRoof = "laje";
        }
      }

      const modItem = data.items.find(
        (i) =>
          i.categoryName === "module" ||
          i.productName.toLowerCase().includes("módulo") ||
          i.productName.toLowerCase().includes("painel")
      );
      const modBrand = modItem?.brandName || "";

      const invItem = data.items.find(
        (i) => i.categoryName === "inverter" || i.categoryName === "microinverter"
      );
      const initialInvType =
        invItem?.categoryName === "microinverter" ||
        invItem?.productName.toLowerCase().includes("micro")
          ? "microinverter"
          : "string";

      let initialGridTopo: "auto" | "mono_220" | "biphasic_127_220" | "tri_220" | "tri_380" =
        "auto";
      if (invItem) {
        const n = invItem.productName.toLowerCase();
        if (n.includes("tri") && n.includes("380")) initialGridTopo = "tri_380";
        else if (n.includes("tri") && n.includes("220")) initialGridTopo = "tri_220";
        else if (n.includes("mono")) initialGridTopo = "mono_220";
      }

      const strBoxItem = data.items.find(
        (i) => i.categoryName === "string_box" || i.productName.toLowerCase().includes("string box")
      );

      const sysKw =
        data.systemPowerKw != null && data.systemPowerKw > 0
          ? String(data.systemPowerKw)
          : modItem
            ? String(Math.round(((modItem.quantity * 600) / 1000) * 100) / 100)
            : "9.75";

      setKitDraft({
        systemKw: sysKw,
        roof: initialRoof,
        brandPreset: modBrand,
        brandCustom: "",
        inverterType: initialInvType,
        gridTopology: initialGridTopo,
        stringBoxId: strBoxItem ? strBoxItem.productId : "none",
      });
      hasUserEditedKitSpecs.current = false;
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Não foi possível carregar os equipamentos.");
    } finally {
      setLoading(false);
    }
  }, [organizationId, proposalId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    async function loadStringBoxes() {
      try {
        if (distributorId) {
          const res = await fetchDistributorProducts(distributorId, {
            category: "string_box",
            limit: 50,
          });
          if (cancelled) return;
          setStringBoxOptions(res.data.map((p) => ({ id: p.product.id, name: p.product.name })));
        } else {
          const res = await fetchProducts({ category: "string_box", pageSize: 50, active: true });
          if (cancelled) return;
          setStringBoxOptions((res.data || []).map((p) => ({ id: p.id, name: p.name })));
        }
      } catch {
        if (!cancelled) setStringBoxOptions([]);
      }
    }
    void loadStringBoxes();
    return () => {
      cancelled = true;
    };
  }, [distributorId]);

  useEffect(() => {
    if (!hasUserEditedKitSpecs.current) return;
    const kw = parseFloat(kitDraft.systemKw.replace(",", "."));
    if (!Number.isFinite(kw) || kw < 0.5 || kw > 5_000_000) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsRecalculating(true);
      setKitRecalcError(null);
      try {
        const preferredBrand =
          kitDraft.brandPreset === "__custom__"
            ? kitDraft.brandCustom.trim() || undefined
            : kitDraft.brandPreset.trim() || undefined;

        const reqPayload: GenerateKitRequest = {
          system_kw: kw,
          roof_type: kitDraft.roof,
          ...(preferredBrand ? { preferred_brand: preferredBrand } : {}),
          ...(distributorId ? { supplier_id: distributorId } : {}),
          inverter_type: kitDraft.inverterType,
          ...(kitDraft.targetInverterQty && kitDraft.targetInverterQty !== "auto"
            ? { target_inverter_qty: parseInt(kitDraft.targetInverterQty, 10) }
            : {}),
          ...(kitDraft.gridTopology && kitDraft.gridTopology !== "auto"
            ? { grid_topology: kitDraft.gridTopology }
            : {}),
          ...(kitDraft.stringBoxId && kitDraft.stringBoxId !== "none"
            ? { string_box_id: kitDraft.stringBoxId }
            : {}),
        };

        let resultKit: GenerateKitResult | null = null;
        try {
          const tiersRes = await generateDistributorTiers(reqPayload);
          if (tiersRes.tiers && tiersRes.tiers.length > 0) {
            resultKit = tiersRes.tiers[1]?.kit_result || tiersRes.tiers[0]?.kit_result || null;
          }
        } catch {
          try {
            const prev = await generateKitWhatsAppPreview(reqPayload);
            resultKit = prev.json;
          } catch (e2) {
            throw e2;
          }
        }

        if (cancelled) return;
        if (!resultKit) throw new Error("Não foi possível recalcular o kit.");

        const resKit = resultKit;
        const newLines: EditableLine[] = resKit.kit_items.map((it) => ({
          productId: it.product_id,
          productName: it.product_name,
          brandName: it.brand_name,
          categoryName: categorizeKitItem(it, resKit),
          quantity: it.quantity,
          unitPrice: it.unit_price,
          changed: true,
          unavailable: false,
          specs:
            it.product_id === resKit.modules?.product_id
              ? {
                  power_w: Math.round(
                    (resKit.system_power_kw / Math.max(1, resKit.modules.quantity)) * 1000
                  ),
                }
              : null,
        }));

        setLines(newLines);
        setQtyDrafts({});
        setModuleQtyOverrides({});
      } catch (err) {
        if (!cancelled) {
          setKitRecalcError(err instanceof Error ? err.message : "Falha ao recalcular o kit.");
        }
      } finally {
        if (!cancelled) {
          setIsRecalculating(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [kitDraft, distributorId]);

  const calculateLockedBosQty = useCallback(
    (targetLine: EditableLine, targetModuleQty: number, currentModuleQty: number): number => {
      const isStructure = targetLine.categoryName === "structure_kit";
      const isProfile = targetLine.categoryName === "profile";

      const structureKits = lines.filter((l) => l.categoryName === "structure_kit");
      const sortedKits = [...structureKits]
        .map((sk) => {
          const match = sk.productName.match(/([0-9]+)\s*MOD/i);
          const maxMods = match && match[1] ? parseInt(match[1], 10) : 1;
          return { ...sk, maxMods };
        })
        .sort((a, b) => b.maxMods - a.maxMods);

      let rem = targetModuleQty;
      const proposedStrs = new Map<string, { qty: number; maxMods: number }>();

      for (let i = 0; i < sortedKits.length; i++) {
        const sk = sortedKits[i]!;
        if (rem <= 0) {
          proposedStrs.set(sk.productId, { qty: 0, maxMods: sk.maxMods });
          continue;
        }
        const isSmallest = i === sortedKits.length - 1;
        const q = isSmallest ? Math.ceil(rem / sk.maxMods) : Math.floor(rem / sk.maxMods);
        proposedStrs.set(sk.productId, { qty: q, maxMods: sk.maxMods });
        rem -= q * sk.maxMods;
      }

      if (isStructure) {
        return proposedStrs.get(targetLine.productId)?.qty ?? targetLine.quantity;
      }

      if (isProfile) {
        const getMetalProfileQty = (
          modQty: number,
          strMap: Map<string, { qty: number; maxMods: number }>
        ) => {
          let profs = 0;
          for (const s of Array.from(strMap.values())) {
            if (s.maxMods === 4) profs += s.qty * 10;
            else if (s.maxMods === 2) profs += s.qty * 5;
            else profs += s.qty * Math.ceil(s.maxMods * 2.5);
          }
          if (modQty % 2 !== 0) profs += 1;
          return profs;
        };

        const originalStrs = new Map<string, { qty: number; maxMods: number }>();
        sortedKits.forEach((sk) =>
          originalStrs.set(sk.productId, { qty: sk.quantity, maxMods: sk.maxMods })
        );

        const metalOrig = getMetalProfileQty(currentModuleQty, originalStrs);

        let roofType: "metal" | "ceramic" | "ground" = "ceramic";
        if (targetLine.quantity === 1 && currentModuleQty > 2) roofType = "ground";
        else if (targetLine.quantity === metalOrig) roofType = "metal";
        else roofType = "ceramic";

        if (roofType === "ground") return 1;
        if (roofType === "metal") return getMetalProfileQty(targetModuleQty, proposedStrs);
        return targetModuleQty % 2 === 0 ? targetModuleQty : targetModuleQty + 1;
      }

      return targetLine.quantity;
    },
    [lines]
  );

  const effectiveQty = useCallback(
    (line: EditableLine): number => {
      const role = roleOf(line.categoryName);
      if (role === "module") {
        return moduleQtyOverrides[line.productId] ?? line.quantity;
      }
      if (role === "inverter") return line.quantity;

      if (role === "locked_bos") {
        const moduleLine = lines.find((l) => roleOf(l.categoryName) === "module");
        if (moduleLine && moduleLine.quantity > 0) {
          const targetModQty = moduleQtyOverrides[moduleLine.productId] ?? moduleLine.quantity;
          return calculateLockedBosQty(line, targetModQty, moduleLine.quantity);
        }
        return line.quantity;
      }

      const raw = qtyDrafts[line.productId];
      if (raw == null) return line.quantity;
      const parsed = parseInt(raw, 10);
      return Number.isFinite(parsed) && parsed >= 1 ? parsed : line.quantity;
    },
    [moduleQtyOverrides, qtyDrafts, lines, calculateLockedBosQty]
  );

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
    (distributorId !== ctx?.distributorId || lines.some((l) => l.changed) || hasQtyAdjustments);

  const moduleLineIndex = lines.findIndex((l) => roleOf(l.categoryName) === "module");
  const inverterLineIndex = lines.findIndex((l) => roleOf(l.categoryName) === "inverter");
  const moduleLine = moduleLineIndex >= 0 ? lines[moduleLineIndex]! : null;
  const inverterLine = inverterLineIndex >= 0 ? lines[inverterLineIndex]! : null;

  const { minAllowedModules, maxAllowedModules } = useMemo(() => {
    let min = 4;
    let max = Infinity;

    if (moduleLine && moduleLine.quantity > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invSpecs = inverterLine?.specs as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modSpecs = moduleLine?.specs as any;

      if (invSpecs?.type === "string") {
        if (typeof invSpecs.max_dc_power === "number" && invSpecs.max_dc_power <= 10000) {
          min = 4;
        }
        const ratio =
          typeof invSpecs.recommended_dc_ac_ratio_max === "number"
            ? invSpecs.recommended_dc_ac_ratio_max
            : 1.0;
        if (typeof invSpecs.max_dc_power === "number" && typeof modSpecs?.power_w === "number") {
          const inverterQty = inverterLine?.quantity || 1;
          max = Math.floor((invSpecs.max_dc_power * inverterQty * ratio) / modSpecs.power_w);
        }
      } else if (invSpecs?.type === "micro") {
        if (typeof invSpecs.channels === "number") {
          const inverterQty = inverterLine?.quantity || 1;
          max = invSpecs.channels * inverterQty;
        }
      }
    }
    return { minAllowedModules: min, maxAllowedModules: max };
  }, [moduleLine, inverterLine]);

  function adjustModuleQuantity(line: EditableLine, delta: number): void {
    setQtyResetNotice(false);
    setModuleQtyOverrides((prev) => {
      const current = prev[line.productId] ?? line.quantity;
      let next = current + delta;

      if (next < minAllowedModules) next = minAllowedModules;
      if (next > maxAllowedModules) next = maxAllowedModules;

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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              specs: (option as any).specs ?? null,
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
      setSaveError("Selecione um catálogo ou estoque antes de salvar.");
      return;
    }
    if (lines.length === 0) {
      setSaveError("Mantenha ao menos um equipamento na lista.");
      return;
    }
    if (lines.some((l) => l.unavailable)) {
      setSaveError(
        `Existem ${unavailableCount} item(ns) indisponíveis no momento — substitua ou remova antes de salvar.`
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
            produtos disponíveis
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
                  Nenhum produto encontrado nessa categoria no catálogo.
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
              Ajuste itens, marcas ou quantidades. Ao salvar, o valor comercial é recalculado e um{" "}
              <span className="font-medium">novo link público</span> é gerado — o anterior deixa de
              funcionar.
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
            ) : !dirty ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                <Calculator className="h-3 w-3" />
                Preço por kWp
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
            <p className="-mt-1 mb-2 text-xs text-[var(--color-muted-foreground)]">
              Ajuste itens ou quantidades do kit da proposta.
            </p>

            {/* Modalidade de Cotação: Preço por kWp (Compacto) */}
            <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/[0.04] p-3 select-none">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Calculator className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[var(--color-foreground)] leading-tight">
                    Preço por kWp
                  </span>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700 dark:text-emerald-300">
                    Perfil do Integrador
                  </span>
                </div>
                <span className="h-4.5 w-4.5 shrink-0 rounded-full border border-emerald-500 bg-emerald-500 text-white flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
              </div>

              <p className="mt-2 text-xs text-[var(--color-muted-foreground)] leading-relaxed">
                Dimensionamento de equipamentos reais com orçamento comercial por R$/kWp da sua
                região, incluindo projeto completo e instalação.
              </p>
            </div>

            {/* Ajustar Especificações do Kit */}
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs">
              <div className="relative space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--color-border)]/60 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-foreground)]">
                      Ajustar Especificações do Kit
                    </h3>
                    <p className="mt-0.5 max-w-xl text-xs sm:text-sm text-[var(--color-muted-foreground)]">
                      Altere potência, tipo de telhado, marca dos módulos ou padrão de rede — o
                      sistema recalcula os dados automaticamente.
                    </p>
                  </div>
                  {isRecalculating ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Recalculando kit...
                    </span>
                  ) : null}
                </div>

                {kitRecalcError ? (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                    {kitRecalcError}
                  </p>
                ) : null}

                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Potência do sistema (kWp) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="proposal-kit-kw"
                        className="text-xs font-semibold text-[var(--color-foreground)]"
                      >
                        Potência do sistema (kWp)
                      </Label>
                      {(() => {
                        const kwNum = parseFloat(kitDraft.systemKw.replace(",", "."));
                        if (!Number.isFinite(kwNum) || kwNum < 1000) return null;
                        if (kwNum >= 1_000_000) {
                          return (
                            <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                              {(kwNum / 1_000_000).toLocaleString("pt-BR", {
                                maximumFractionDigits: 3,
                              })}{" "}
                              GWp
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {(kwNum / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}{" "}
                            MWp
                          </span>
                        );
                      })()}
                    </div>
                    <Input
                      id="proposal-kit-kw"
                      type="text"
                      inputMode="decimal"
                      className="h-11 border-[var(--color-border)] bg-[var(--color-background)] font-medium tabular-nums focus-visible:ring-emerald-500"
                      value={kitDraft.systemKw}
                      onChange={(e) => {
                        hasUserEditedKitSpecs.current = true;
                        setKitDraft((d) => ({ ...d, systemKw: e.target.value }));
                      }}
                    />
                  </div>

                  {/* Tipo de telhado */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="proposal-kit-roof"
                      className="text-xs font-semibold text-[var(--color-foreground)]"
                    >
                      Tipo de telhado
                    </Label>
                    <Select
                      id="proposal-kit-roof"
                      className="h-11 border-[var(--color-border)]"
                      value={kitDraft.roof}
                      onChange={(e) => {
                        hasUserEditedKitSpecs.current = true;
                        setKitDraft((d) => ({
                          ...d,
                          roof: e.target.value as RoofType,
                        }));
                      }}
                    >
                      {ROOF_TYPE_SELECT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Marca dos painéis */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="proposal-kit-brand"
                      className="text-xs font-semibold text-[var(--color-foreground)]"
                    >
                      Marca dos painéis
                    </Label>
                    <Select
                      id="proposal-kit-brand"
                      className="h-11 border-[var(--color-border)]"
                      value={kitDraft.brandPreset}
                      onChange={(e) => {
                        hasUserEditedKitSpecs.current = true;
                        setKitDraft((d) => ({
                          ...d,
                          brandPreset: e.target.value,
                        }));
                      }}
                    >
                      <option value="">Melhor custo (qualquer marca)</option>
                      {POPULAR_MODULE_BRANDS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                      <option value="__custom__">Outra (digitar)</option>
                    </Select>
                  </div>

                  {kitDraft.brandPreset === "__custom__" ? (
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                      <Label
                        htmlFor="proposal-kit-brand-custom"
                        className="text-xs font-semibold text-[var(--color-foreground)]"
                      >
                        Nome da marca
                      </Label>
                      <Input
                        id="proposal-kit-brand-custom"
                        type="text"
                        placeholder="Ex.: Canadian Solar"
                        className="h-11 border-[var(--color-border)]"
                        value={kitDraft.brandCustom}
                        onChange={(e) => {
                          hasUserEditedKitSpecs.current = true;
                          setKitDraft((d) => ({
                            ...d,
                            brandCustom: e.target.value,
                          }));
                        }}
                      />
                    </div>
                  ) : null}

                  {/* Tipo de Inversor */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="proposal-kit-inverter-type"
                      className="text-xs font-semibold text-[var(--color-foreground)]"
                    >
                      Tipo de Inversor
                    </Label>
                    <Select
                      id="proposal-kit-inverter-type"
                      className="h-11 w-full border-[var(--color-border)]"
                      value={kitDraft.inverterType}
                      onChange={(e) => {
                        hasUserEditedKitSpecs.current = true;
                        setKitDraft((d) => ({
                          ...d,
                          inverterType: e.target.value as KitDraftState["inverterType"],
                        }));
                      }}
                    >
                      <option value="string">String Inverter</option>
                      <option value="microinverter">Microinversor</option>
                      <option value="hybrid">Híbrido</option>
                      <option value="off_grid">Off-Grid</option>
                    </Select>
                  </div>

                  {/* Quantidade de Inversores */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="proposal-kit-inverter-qty"
                      className="text-xs font-semibold text-[var(--color-foreground)]"
                    >
                      Qtd. de Inversores
                    </Label>
                    <Select
                      id="proposal-kit-inverter-qty"
                      className="h-11 w-full border-[var(--color-border)]"
                      value={kitDraft.targetInverterQty}
                      onChange={(e) => {
                        hasUserEditedKitSpecs.current = true;
                        setKitDraft((d) => ({
                          ...d,
                          targetInverterQty: e.target.value as KitDraftState["targetInverterQty"],
                        }));
                      }}
                    >
                      <option value="auto">Automático (1 ou múltiplos)</option>
                      <option value="1">1 Inversor</option>
                      <option value="2">2 Inversores (mesma marca)</option>
                      <option value="3">3 Inversores (mesma marca)</option>
                      <option value="4">4 Inversores (mesma marca)</option>
                    </Select>
                  </div>

                  {/* Padrão da rede / Tensão */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="proposal-kit-grid-topology"
                      className="text-xs font-semibold text-[var(--color-foreground)]"
                    >
                      Padrão da rede / Tensão
                    </Label>
                    <Select
                      id="proposal-kit-grid-topology"
                      className="h-11 w-full border-[var(--color-border)]"
                      value={kitDraft.gridTopology}
                      onChange={(e) => {
                        hasUserEditedKitSpecs.current = true;
                        setKitDraft((d) => ({
                          ...d,
                          gridTopology: e.target.value as KitDraftState["gridTopology"],
                        }));
                      }}
                    >
                      <option value="auto">Automático / Qualquer</option>
                      <option value="mono_220">Monofásico 220V</option>
                      <option value="biphasic_127_220">Bifásico 127V / 220V</option>
                      <option value="tri_220">Trifásico 220V (ou Mono 220V)</option>
                      <option value="tri_380">Trifásico 380V (ou Mono 220V)</option>
                    </Select>
                  </div>

                  {/* String Box (Opcional) */}
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                    <Label
                      htmlFor="proposal-kit-string-box"
                      className="text-xs font-semibold text-[var(--color-foreground)]"
                    >
                      String Box (Opcional)
                    </Label>
                    <Select
                      id="proposal-kit-string-box"
                      className="h-11 w-full border-[var(--color-border)]"
                      value={kitDraft.stringBoxId}
                      onChange={(e) => {
                        hasUserEditedKitSpecs.current = true;
                        setKitDraft((d) => ({
                          ...d,
                          stringBoxId: e.target.value || "none",
                        }));
                      }}
                    >
                      <option value="none">Sem String Box (Padrão)</option>
                      {stringBoxOptions.map((sb) => (
                        <option key={sb.id} value={sb.id}>
                          {sb.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            </div>

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
                    if (qty <= 0) return null;
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
                                  Indisponível no momento
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
                                  <span className="text-red-600 font-semibold dark:text-red-400">
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
                                  disabled={qty <= minAllowedModules}
                                  title={
                                    qty <= minAllowedModules
                                      ? "Quantidade mínima (startup)"
                                      : "Um módulo a menos"
                                  }
                                  aria-label="Um módulo a menos"
                                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] text-sm leading-none hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => adjustModuleQuantity(line, -1)}
                                >
                                  −
                                </button>
                                <span className="min-w-[2ch] text-center">{qty}</span>
                                <button
                                  type="button"
                                  disabled={qty >= maxAllowedModules}
                                  title={
                                    qty >= maxAllowedModules
                                      ? "Limite máximo de módulos para este inversor"
                                      : "Um módulo a mais"
                                  }
                                  aria-label="Um módulo a mais"
                                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] text-sm leading-none hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--color-border)]"
                                  onClick={() => adjustModuleQuantity(line, 1)}
                                >
                                  +
                                </button>
                              </span>
                            ) : role === "inverter" ? (
                              <span className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={qty <= 1 || isRecalculating}
                                  title="Diminuir quantidade de inversores"
                                  aria-label="Diminuir quantidade de inversores"
                                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] text-sm leading-none hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => {
                                    hasUserEditedKitSpecs.current = true;
                                    const nextQty = Math.max(1, qty - 1);
                                    setKitDraft((d) => ({
                                      ...d,
                                      targetInverterQty: String(
                                        nextQty
                                      ) as KitDraftState["targetInverterQty"],
                                    }));
                                  }}
                                >
                                  −
                                </button>
                                <span
                                  className="min-w-[2.5ch] text-center font-medium"
                                  title="Quantidade de inversores idênticos"
                                >
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  disabled={qty >= 4 || isRecalculating}
                                  title="Adicionar mais um inversor idêntico"
                                  aria-label="Adicionar mais um inversor idêntico"
                                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] text-sm leading-none hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => {
                                    hasUserEditedKitSpecs.current = true;
                                    const nextQty = Math.min(4, qty + 1);
                                    setKitDraft((d) => ({
                                      ...d,
                                      targetInverterQty: String(
                                        nextQty
                                      ) as KitDraftState["targetInverterQty"],
                                    }));
                                  }}
                                >
                                  +
                                </button>
                              </span>
                            ) : role === "locked_bos" ? (
                              <span
                                title="Quantidade definida pelo dimensionamento do kit"
                                className="cursor-help underline decoration-dotted underline-offset-2"
                              >
                                {qty}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={qty <= 1}
                                  aria-label={`Diminuir quantidade de ${line.productName}`}
                                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] text-sm leading-none hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => {
                                    setQtyResetNotice(false);
                                    const next = Math.max(1, qty - 1);
                                    setQtyDrafts((prev) =>
                                      next === line.quantity
                                        ? (() => {
                                            const clone = { ...prev };
                                            delete clone[line.productId];
                                            return clone;
                                          })()
                                        : { ...prev, [line.productId]: String(next) }
                                    );
                                  }}
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  inputMode="numeric"
                                  aria-label={`Quantidade de ${line.productName}`}
                                  className={`h-7 w-12 rounded-md border bg-[var(--color-background)] px-1 text-center tabular-nums outline-none text-xs ${
                                    belowCalculated
                                      ? "border-red-500/60 focus:border-red-400"
                                      : "border-[var(--color-border)] focus:border-emerald-400"
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
                                <button
                                  type="button"
                                  aria-label={`Aumentar quantidade de ${line.productName}`}
                                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] text-sm leading-none hover:border-emerald-400"
                                  onClick={() => {
                                    setQtyResetNotice(false);
                                    const next = qty + 1;
                                    setQtyDrafts((prev) =>
                                      next === line.quantity
                                        ? (() => {
                                            const clone = { ...prev };
                                            delete clone[line.productId];
                                            return clone;
                                          })()
                                        : { ...prev, [line.productId]: String(next) }
                                    );
                                  }}
                                >
                                  +
                                </button>
                              </span>
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
              </table>
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

            {dirty ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Salvar recalcula custos e margem pelas regras da empresa e{" "}
                  <span className="font-medium">invalida o link público anterior</span>.
                </p>
                <Button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || lines.length === 0 || !distributorId || unavailableCount > 0}
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
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
