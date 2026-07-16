"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Autocomplete, CircularProgress, Menu, MenuItem, TextField } from "@mui/material";
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  Cpu,
  ExternalLink,
  Link2,
  Loader2,
  Package,
  Share2,
  Shield,
  Sparkles,
  Sun,
  Upload,
  FileText,
  MessageCircle,
  Warehouse,
  Zap,
} from "lucide-react";
import { buildSystemDealTitle } from "@/components/lead-detail/lead-detail-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createDeal,
  createEnergyBill,
  createLeadFinancialSimulation,
  createProposalForDeal,
  getLead,
  guessEnergyBillContentType,
  listGeoCities,
  listGeoStates,
  patchDeal,
  uploadEnergyBillFileToS3,
  waitForEnergyBillExtraction,
  waMeUrl,
  type DealStage as ApiDealStage,
  type EnergyBillExtractedPayload,
  type LeadDetail,
} from "@/lib/leads-api";
import { sizingBillHistoryFromExtracted } from "@/lib/bill-consumption-calendar-series";
import {
  extractPdfText,
  isBillPdfTextLayerUsable,
  isPasswordException,
  openPdfWithPdfJs,
  passwordExceptionNeedsPassword,
  renderFirstPdfPageToPng,
} from "@/lib/bill-pdf-client";
import type { Deal, DealStage } from "@/app/(authenticated)/pipeline/use-deals";
import { listCostRules } from "@/lib/cost-rules-api";
import {
  generateKitWhatsAppPreview,
  listKitAlternatives,
  listKitSourceOptions,
  type GenerateKitResult,
  type KitAlternativeOption,
  type KitCrossSourceAlternative,
  type KitSourceOption,
  type KitSwapCategory,
} from "@/lib/kit-api";
import { buildProposalIntegratorRenderedData } from "@/lib/proposal-integrator-snapshot";
import { getStockFreightRules } from "@/lib/stock-api";
import { proposalStudyBridge } from "@/components/pipeline/proposal-study-bridge";
import {
  getBillGdSimulationSummary,
  irradiacaoFromSolarResource,
  normalizeGeoName,
  parseBillLocation,
  prepareQuickEconomiaFromExtracted,
  quickResultToPersistedSimulationDraft,
  resolveBillLocationString,
  simulateProposal,
  type QuickEconomiaRoofType as RoofType,
  type QuickEconomiaSimulationInput as SimulationInput,
  type QuickEconomiaSimulationResult as SimulationResult,
} from "@energivia/proposal-economia";

const ROOF_TYPE_SELECT_OPTIONS: { value: RoofType; label: string }[] = [
  { value: "ceramic", label: "Colonial / cerâmico" },
  { value: "metal", label: "Metálico (mini trilho)" },
  { value: "fibromadeira", label: "Fibromadeira" },
  { value: "fibrometal", label: "Fibrometal (autobrocante)" },
  { value: "ground", label: "Solo" },
  { value: "laje", label: "Laje" },
];

const MODULE_BRAND_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Melhor custo (qualquer marca)" },
  { value: "Canadian Solar", label: "Canadian Solar" },
  { value: "JA Solar", label: "JA Solar" },
  { value: "Trina", label: "Trina" },
  { value: "__custom__", label: "Outra (digitar)" },
];

function clampSystemKw(kw: number): number {
  const rounded = Math.round(kw * 100) / 100;
  return Math.min(1000, Math.max(0.5, rounded));
}

function kitRequestEquals(a: ProposalKitRequest | null, b: ProposalKitRequest): boolean {
  return (
    a !== null &&
    a.systemKw === b.systemKw &&
    a.roof === b.roof &&
    a.preferredBrand === b.preferredBrand &&
    Boolean(a.ownStock) === Boolean(b.ownStock) &&
    a.supplierId === b.supplierId &&
    a.pinnedModuleId === b.pinnedModuleId &&
    a.pinnedInverterId === b.pinnedInverterId
  );
}

function kitItemsTotal(items: { quantity: number; unit_price: number }[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
}

type GeneratedProposal = {
  id: string;
  dealId: string;
  economiaMensal: number;
  valorSistema: number;
  payback: number;
  status: "generated";
  createdAt: Date;
  estimateNote?: string;
  tamanhoSistemaKw: number;
  roofType: RoofType;
  monthlyConsumptionKwh: number;
};

type ProposalFieldErrors = {
  consumo?: string;
  valorConta?: string;
  systemKw?: string;
  contaLuz?: string;
  roofType?: string;
};

type ProposalInputMode = "upload" | "manual";

type ManualSizingBasis = "consumption" | "power";

type ProposalKitSource = { kind: "auto" } | { kind: "own" } | { kind: "supplier"; id: string };

type ProposalKitDraft = {
  systemKw: string;
  roof: RoofType;
  brandPreset: string;
  brandCustom: string;
  source: ProposalKitSource;
  pins: { moduleId?: string; inverterId?: string };
};

type ProposalKitRequest = {
  systemKw: number;
  roof: RoofType;
  preferredBrand?: string;
  ownStock?: boolean;
  supplierId?: string;
  pinnedModuleId?: string;
  pinnedInverterId?: string;
};

type PipelineBillAttachment =
  | { status: "none" }
  | { status: "processing"; message: string }
  | { status: "needs_password"; file: File }
  | {
      status: "ready";
      billId: string;
      displayName: string;
      fileUrl: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      extractedData: EnergyBillExtractedPayload | null;
    }
  | { status: "error"; message: string };

const UUID_LIKE_FILE_BASE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function unlockedBillImageUploadName(originalFileName: string): {
  uploadFileName: string;
  displayLabel: string;
} {
  const base = originalFileName.replace(/\.pdf$/i, "").trim() || "conta";
  if (UUID_LIKE_FILE_BASE.test(base)) {
    return {
      uploadFileName: "conta-luz-primeira-pagina.png",
      displayLabel: "Conta de luz (imagem da 1a pagina)",
    };
  }
  return {
    uploadFileName: `${base}-primeira-pagina.png`,
    displayLabel: `${base}-primeira-pagina.png`,
  };
}

function unlockedBillTextUploadName(originalFileName: string): {
  uploadFileName: string;
  displayLabel: string;
} {
  const base = originalFileName.replace(/\.pdf$/i, "").trim() || "conta";
  if (UUID_LIKE_FILE_BASE.test(base)) {
    return {
      uploadFileName: "conta-luz-texto.txt",
      displayLabel: "Conta de luz (texto extraído do PDF)",
    };
  }
  return {
    uploadFileName: `${base}-texto.txt`,
    displayLabel: `${base}-texto.txt`,
  };
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildExtractionDebugHint(rawData: Record<string, unknown> | undefined): string {
  if (!rawData) return "";
  const quality =
    typeof rawData["qualityStatus"] === "string" ? rawData["qualityStatus"] : undefined;
  const provider = typeof rawData["provider"] === "string" ? rawData["provider"] : undefined;
  const evidence =
    rawData["evidence"] && typeof rawData["evidence"] === "object"
      ? (rawData["evidence"] as Record<string, unknown>)
      : undefined;
  const monthly =
    evidence?.["monthlyConsumption"] && typeof evidence["monthlyConsumption"] === "object"
      ? (evidence["monthlyConsumption"] as Record<string, unknown>)
      : undefined;
  const source =
    typeof monthly?.["sourceSnippet"] === "string" ? monthly["sourceSnippet"] : undefined;
  const value = typeof monthly?.["value"] === "string" ? monthly["value"] : undefined;
  const confidence =
    typeof monthly?.["confidence"] === "string" ? monthly["confidence"] : undefined;
  const clippedSource = source ? source.slice(0, 140) : undefined;

  const parts = [
    quality ? `qualidade=${quality}` : null,
    provider ? `fornecedor=${provider}` : null,
    confidence ? `confianca=${confidence}` : null,
    value ? `valor_extraido=${value}` : null,
    clippedSource ? `trecho="${clippedSource}"` : null,
  ].filter(Boolean);

  return parts.length ? `\n[debug extração] ${parts.join(" | ")}` : "";
}

function buildExtractionFallbackDebug(params: {
  billId: string;
  status: string;
  extractedData: unknown;
}): string {
  const serialized =
    typeof params.extractedData === "undefined"
      ? "undefined"
      : JSON.stringify(params.extractedData);
  const clipped =
    serialized && serialized.length > 420 ? `${serialized.slice(0, 420)}...` : serialized;
  return `\n[debug extração] status=${params.status} | billId=${params.billId} | extractedData=${clipped ?? "null"}`;
}

function formatExtractionValue(value: unknown): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "-";
  if (typeof value === "string") return value.trim() || "-";
  if (value === null || typeof value === "undefined") return "-";
  return JSON.stringify(value);
}

type BillExtractionUiNote = { kind: "history_average" | "distributed_generation"; text: string };

function getBillExtractionUiNotes(raw: unknown): BillExtractionUiNote[] {
  if (!raw || typeof raw !== "object") return [];
  const rd = raw as Record<string, unknown>;
  const debug =
    rd["debug"] && typeof rd["debug"] === "object"
      ? (rd["debug"] as Record<string, unknown>)
      : undefined;
  if (!debug) return [];
  const notes: BillExtractionUiNote[] = [];
  const monthCount = debug["consumptionHistoryMonthCount"];
  const refKwh = debug["referenceMonthConsumptionKwh"];
  const kitSizingAvg = debug["kitSizingUsesHistoryAverage"] === true;
  if (kitSizingAvg && typeof monthCount === "number" && monthCount >= 3) {
    const refPart =
      typeof refKwh === "number" && refKwh > 0 ? ` Mês de referência na conta: ${refKwh} kWh.` : "";
    notes.push({
      kind: "history_average",
      text: `A simulação usa a média de ${monthCount} meses do histórico de consumo da fatura.${refPart}`,
    });
  }
  const dg = debug["distributedGeneration"];
  if (dg && typeof dg === "object") {
    const dgo = dg as Record<string, unknown>;
    if (dgo["detected"] === true) {
      const inj = dgo["injectedKwhMonth"];
      const injPart =
        typeof inj === "number" && inj > 0 ? ` Injeção no período (aprox.): ${inj} kWh.` : "";
      let text = `Fatura indica geração distribuída (GD).${injPart}`;
      if (
        debug["gdSimulationCombined"] === true &&
        typeof debug["gdGridDrawKwhBeforeSimulation"] === "number" &&
        typeof inj === "number" &&
        inj > 0
      ) {
        const grid = Math.round(debug["gdGridDrawKwhBeforeSimulation"] as number);
        const net = Math.max(0, grid - Math.round(inj));
        text += ` Dimensionamento: ${grid} kWh (rede) − ${Math.round(inj)} kWh (gerado/injetado) ≈ ${net} kWh/mês.`;
      }
      notes.push({
        kind: "distributed_generation",
        text,
      });
    }
  }
  return notes;
}

function mapApiStage(stage: ApiDealStage | null): DealStage {
  switch (stage) {
    case "NEW":
      return "novo";
    case "CONTACTED":
      return "contato";
    case "PROPOSAL":
      return "proposta";
    case "NEGOTIATION":
      return "negociacao";
    case "WON":
    case "LOST":
      return "fechado";
    default:
      return "novo";
  }
}

function formatWhatsappLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  if (!d) return null;
  return d.startsWith("55") ? `+${d}` : `+55${d}`;
}

function latestDeal(detail: LeadDetail) {
  if (!detail.deals.length) return null;
  return [...detail.deals].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0]!;
}

export function buildDealFromLeadDetail(leadDetail: LeadDetail): Deal {
  const top = latestDeal(leadDetail);
  const whatsappLabel = formatWhatsappLabel(leadDetail.whatsapp);
  const nextDate = top?.nextActionAt ? new Date(top.nextActionAt) : new Date(leadDetail.updatedAt);
  const estimatedValueRaw = top?.value ? Number(top.value) : 0;
  return {
    id: leadDetail.id,
    leadId: leadDetail.id,
    dealId: top?.id ?? null,
    clientName: leadDetail.name,
    contact: leadDetail.email?.trim() || whatsappLabel || "Sem contato",
    whatsapp: leadDetail.whatsapp ?? null,
    stage: mapApiStage(top?.stage ?? null),
    order: 0,
    value: Number.isFinite(estimatedValueRaw) ? estimatedValueRaw : 0,
    nextStepDate: nextDate,
    recentAt: new Date(leadDetail.updatedAt),
    hasProposal: leadDetail.deals.some((d) => d.proposals.length > 0),
  };
}

export type ProposalEconomicsSync = {
  updateDealStage: (leadId: string, stage: DealStage) => void;
  updateDealProposalStatus: (leadId: string, hasProposal: boolean) => void;
};

export type ProposalEconomicsModalHandle = {
  openFromDeal: (deal: Deal, opts?: { forceStudyModal?: boolean }) => Promise<void>;
  openFromLeadId: (leadId: string, opts?: { forceStudyModal?: boolean }) => Promise<void>;
  openWithFile: (deal: Deal, file: File) => Promise<void>;
};

type ProposalEconomicsModalProps = {
  organizationId: string | null;
  sync?: ProposalEconomicsSync | null;
  onBusyChange?: (state: { leadId: string | null; loading: boolean }) => void;
};

export const ProposalEconomicsModal = forwardRef<
  ProposalEconomicsModalHandle,
  ProposalEconomicsModalProps
>(function ProposalEconomicsModal({ organizationId, sync: syncProp, onBusyChange }, ref) {
  const router = useRouter();
  const currentOrganizationId = organizationId;
  const sync = syncProp ?? proposalStudyBridge.getPipelineHooks();
  const [proposalDeal, setProposalDeal] = useState<Deal | null>(null);
  const [proposalFormOpen, setProposalFormOpen] = useState(false);
  const [proposalResultOpen, setProposalResultOpen] = useState(false);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalFieldErrors, setProposalFieldErrors] = useState<ProposalFieldErrors>({});
  const [proposalInputMode, setProposalInputMode] = useState<ProposalInputMode>("upload");
  const [manualSizingBasis, setManualSizingBasis] = useState<ManualSizingBasis>("consumption");
  const [generatedProposal, setGeneratedProposal] = useState<GeneratedProposal | null>(null);
  const [inputConsumption, setInputConsumption] = useState("");
  const [inputBillValue, setInputBillValue] = useState<number | null>(null);
  const [inputSystemKw, setInputSystemKw] = useState("");
  const [geoStates, setGeoStates] = useState<{ id: string; uf: string; name: string }[]>([]);
  const [geoCities, setGeoCities] = useState<
    { id: string; name: string; solarResource?: unknown }[]
  >([]);
  const [selectedState, setSelectedState] = useState<{
    id: string;
    uf: string;
    name: string;
  } | null>(null);
  const [selectedCity, setSelectedCity] = useState<{ id: string; name: string } | null>(null);
  const [roofType, setRoofType] = useState<RoofType | "">("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [billAttachment, setBillAttachment] = useState<PipelineBillAttachment>({ status: "none" });
  const [pdfPasswordInput, setPdfPasswordInput] = useState("");
  const [isUploadDragActive, setIsUploadDragActive] = useState(false);
  const billFileInputRef = useRef<HTMLInputElement | null>(null);
  const [proposalKitRequest, setProposalKitRequest] = useState<ProposalKitRequest | null>(null);
  const [proposalKitDraft, setProposalKitDraft] = useState<ProposalKitDraft>({
    systemKw: "5",
    roof: "ceramic",
    brandPreset: "",
    brandCustom: "",
    source: { kind: "auto" },
    pins: {},
  });
  const [kitSourceOptions, setKitSourceOptions] = useState<KitSourceOption[] | null>(null);
  const [kitSourceLoading, setKitSourceLoading] = useState(false);
  const autoSourceAppliedRef = useRef(false);
  const [kitSwapCategory, setKitSwapCategory] = useState<KitSwapCategory | null>(null);
  const [kitAlternatives, setKitAlternatives] = useState<KitAlternativeOption[] | null>(null);
  const [kitCrossAlternatives, setKitCrossAlternatives] = useState<
    KitCrossSourceAlternative[] | null
  >(null);
  const [kitAlternativesLoading, setKitAlternativesLoading] = useState(false);
  const [kitAlternativesError, setKitAlternativesError] = useState<string | null>(null);
  const [kitQtyDrafts, setKitQtyDrafts] = useState<Record<string, string>>({});
  const kitQtyDraftsRef = useRef<Record<string, string>>({});
  kitQtyDraftsRef.current = kitQtyDrafts;
  const [kitQtyResetNotice, setKitQtyResetNotice] = useState(false);
  const [proposalKitResult, setProposalKitResult] = useState<GenerateKitResult | null>(null);
  const [proposalKitWhatsapp, setProposalKitWhatsapp] = useState<string | null>(null);
  const [proposalKitLoading, setProposalKitLoading] = useState(false);
  const [proposalKitError, setProposalKitError] = useState<string | null>(null);
  const [proposalKitCopied, setProposalKitCopied] = useState(false);
  const [proposalLinkCopied, setProposalLinkCopied] = useState(false);
  const [shareMenuAnchor, setShareMenuAnchor] = useState<HTMLElement | null>(null);
  const [proposalCreateLoading, setProposalCreateLoading] = useState(false);
  const [proposalCreateError, setProposalCreateError] = useState<string | null>(null);
  const [proposalDiscount, setProposalDiscount] = useState<number | null>(null);
  useEffect(() => {
    if (!currentOrganizationId) return;
    let cancelled = false;
    setGeoLoading(true);
    void listGeoStates(currentOrganizationId)
      .then((rows) => {
        if (cancelled) return;
        setGeoStates(rows.map((s) => ({ id: s.id, uf: s.uf, name: s.name })));
      })
      .catch(() => {
        if (cancelled) return;
        setGeoStates([]);
      })
      .finally(() => {
        if (!cancelled) setGeoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentOrganizationId]);

  useEffect(() => {
    if (!currentOrganizationId || !selectedState?.id) {
      setGeoCities([]);
      setSelectedCity(null);
      return;
    }
    let cancelled = false;
    setGeoLoading(true);
    void listGeoCities(currentOrganizationId, selectedState.id)
      .then((rows) => {
        if (cancelled) return;
        setGeoCities(rows.map((c) => ({ id: c.id, name: c.name, solarResource: c.solarResource })));
      })
      .catch(() => {
        if (cancelled) return;
        setGeoCities([]);
      })
      .finally(() => {
        if (!cancelled) setGeoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentOrganizationId, selectedState?.id]);

  useEffect(() => {
    if (!proposalResultOpen || !generatedProposal) {
      setProposalKitRequest(null);
      setProposalKitResult(null);
      setProposalKitWhatsapp(null);
      setProposalKitError(null);
      setProposalKitCopied(false);
      setKitSourceOptions(null);
      autoSourceAppliedRef.current = false;
      setKitSwapCategory(null);
      setKitAlternatives(null);
      setKitCrossAlternatives(null);
      setKitAlternativesError(null);
      setKitQtyDrafts({});
      setKitQtyResetNotice(false);
      return;
    }
    const kw = clampSystemKw(generatedProposal.tamanhoSistemaKw);
    autoSourceAppliedRef.current = false;
    setKitSwapCategory(null);
    setKitQtyDrafts({});
    setKitQtyResetNotice(false);
    setProposalKitDraft({
      systemKw: String(kw),
      roof: generatedProposal.roofType,
      brandPreset: "",
      brandCustom: "",
      source: { kind: "auto" },
      pins: {},
    });
    setProposalKitRequest({ systemKw: kw, roof: generatedProposal.roofType });
  }, [proposalResultOpen, generatedProposal?.id]);

  useEffect(() => {
    if (!proposalResultOpen || !proposalKitRequest) return;
    let cancelled = false;
    setProposalKitLoading(true);
    setProposalKitError(null);
    void (async () => {
      try {
        const preview = await generateKitWhatsAppPreview({
          system_kw: proposalKitRequest.systemKw,
          roof_type: proposalKitRequest.roof,
          ...(proposalKitRequest.preferredBrand
            ? { preferred_brand: proposalKitRequest.preferredBrand }
            : {}),
          ...(proposalKitRequest.ownStock ? { own_stock: true } : {}),
          ...(proposalKitRequest.supplierId ? { supplier_id: proposalKitRequest.supplierId } : {}),
          ...(proposalKitRequest.pinnedModuleId
            ? { pinned_module_id: proposalKitRequest.pinnedModuleId }
            : {}),
          ...(proposalKitRequest.pinnedInverterId
            ? { pinned_inverter_id: proposalKitRequest.pinnedInverterId }
            : {}),
        });
        if (cancelled) return;
        setProposalKitResult(preview.json);
        setProposalKitWhatsapp(preview.whatsapp_message);
      } catch (e) {
        if (cancelled) return;
        setProposalKitResult(null);
        setProposalKitWhatsapp(null);
        setProposalKitError(e instanceof Error ? e.message : "Não foi possível montar o kit.");
      } finally {
        if (!cancelled) setProposalKitLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proposalResultOpen, proposalKitRequest]);

  useEffect(() => {
    if (!proposalResultOpen || !generatedProposal) return;
    const timer = window.setTimeout(() => {
      const kw = parseFloat(proposalKitDraft.systemKw.replace(",", "."));
      if (!Number.isFinite(kw) || kw < 0.5 || kw > 1000) {
        setProposalKitError("Informe uma potência entre 0,5 e 1000 kWp.");
        return;
      }
      setProposalKitError(null);
      let preferred: string | undefined;
      if (proposalKitDraft.brandPreset === "__custom__") {
        preferred = proposalKitDraft.brandCustom.trim() || undefined;
      } else if (proposalKitDraft.brandPreset.trim()) {
        preferred = proposalKitDraft.brandPreset;
      }
      const next: ProposalKitRequest = {
        systemKw: clampSystemKw(kw),
        roof: proposalKitDraft.roof,
        ...(preferred ? { preferredBrand: preferred } : {}),
        ...(proposalKitDraft.source.kind === "own" ? { ownStock: true } : {}),
        ...(proposalKitDraft.source.kind === "supplier"
          ? { supplierId: proposalKitDraft.source.id }
          : {}),
        ...(proposalKitDraft.pins.moduleId
          ? { pinnedModuleId: proposalKitDraft.pins.moduleId }
          : {}),
        ...(proposalKitDraft.pins.inverterId
          ? { pinnedInverterId: proposalKitDraft.pins.inverterId }
          : {}),
      };
      setProposalKitRequest((prev) => (kitRequestEquals(prev, next) ? prev : next));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [proposalResultOpen, generatedProposal, proposalKitDraft]);

  const kitSourceBaseKey = proposalKitRequest
    ? `${proposalKitRequest.systemKw}|${proposalKitRequest.roof}|${proposalKitRequest.preferredBrand ?? ""}`
    : null;
  useEffect(() => {
    if (!proposalResultOpen || !kitSourceBaseKey) return;
    const [kwPart, roofPart, brandPart] = kitSourceBaseKey.split("|");
    let cancelled = false;
    setKitSourceLoading(true);
    void listKitSourceOptions({
      system_kw: Number(kwPart),
      roof_type: roofPart ?? "ceramic",
      ...(brandPart ? { preferred_brand: brandPart } : {}),
    })
      .then((res) => {
        if (!cancelled) setKitSourceOptions(res.sources);
      })
      .catch(() => {
        if (!cancelled) setKitSourceOptions(null);
      })
      .finally(() => {
        if (!cancelled) setKitSourceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [proposalResultOpen, kitSourceBaseKey]);

  useEffect(() => {
    if (Object.keys(kitQtyDraftsRef.current).length > 0) {
      setKitQtyResetNotice(true);
      setKitQtyDrafts({});
    }
  }, [proposalKitRequest]);

  useEffect(() => {
    if (!kitSwapCategory || !proposalKitRequest) {
      setKitAlternatives(null);
      setKitCrossAlternatives(null);
      setKitAlternativesError(null);
      return;
    }
    let cancelled = false;
    setKitAlternativesLoading(true);
    setKitAlternativesError(null);
    void listKitAlternatives({
      category: kitSwapCategory,
      include_other_sources: true,
      system_kw: proposalKitRequest.systemKw,
      roof_type: proposalKitRequest.roof,
      ...(proposalKitRequest.preferredBrand
        ? { preferred_brand: proposalKitRequest.preferredBrand }
        : {}),
      ...(proposalKitRequest.ownStock ? { own_stock: true } : {}),
      ...(proposalKitRequest.supplierId ? { supplier_id: proposalKitRequest.supplierId } : {}),
      ...(proposalKitRequest.pinnedModuleId
        ? { pinned_module_id: proposalKitRequest.pinnedModuleId }
        : {}),
      ...(proposalKitRequest.pinnedInverterId
        ? { pinned_inverter_id: proposalKitRequest.pinnedInverterId }
        : {}),
    })
      .then((res) => {
        if (cancelled) return;
        setKitAlternatives(res.alternatives);
        setKitCrossAlternatives(res.other_sources ?? []);
      })
      .catch((e) => {
        if (!cancelled) {
          setKitAlternatives(null);
          setKitCrossAlternatives(null);
          setKitAlternativesError(
            e instanceof Error ? e.message : "Não foi possível listar as alternativas."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setKitAlternativesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kitSwapCategory, proposalKitRequest]);

  useEffect(() => {
    if (!kitSourceOptions || autoSourceAppliedRef.current) return;
    if (proposalKitDraft.source.kind !== "auto") {
      autoSourceAppliedRef.current = true;
      return;
    }
    const best = kitSourceOptions
      .filter((s) => s.type === "supplier" && s.available && s.complete && s.supplier_id)
      .sort(
        (a, b) => (a.total ?? Number.MAX_SAFE_INTEGER) - (b.total ?? Number.MAX_SAFE_INTEGER)
      )[0];
    if (best?.supplier_id) {
      autoSourceAppliedRef.current = true;
      const supplierId = best.supplier_id;
      setProposalKitDraft((d) => ({ ...d, source: { kind: "supplier", id: supplierId } }));
    }
  }, [kitSourceOptions, proposalKitDraft.source.kind]);
  const heuristicaIrradiacao = useMemo(() => {
    const row = geoCities.find((c) => c.id === selectedCity?.id);
    const fromDb = irradiacaoFromSolarResource(row?.solarResource);
    if (fromDb != null) return fromDb;
    if (selectedCity) return 145;
    return 140;
  }, [geoCities, selectedCity?.id]);

  useEffect(() => {
    const state = {
      leadId: proposalLoading ? (proposalDeal?.leadId ?? null) : null,
      loading: proposalLoading,
    };
    onBusyChange?.(state);
    proposalStudyBridge.notifyProposalBusy(state);
  }, [proposalLoading, proposalDeal?.leadId, onBusyChange]);

  const applyGeoFromBillLocation = useCallback(
    async (
      orgId: string,
      locationStr: string,
      states: { id: string; uf: string; name: string }[]
    ): Promise<void> => {
      const parsed = parseBillLocation(locationStr);
      if (!parsed.uf || !parsed.cityName) return;
      const st = states.find((s) => s.uf.toUpperCase() === parsed.uf!.toUpperCase());
      if (!st) return;
      setSelectedState(st);
      const rows = await listGeoCities(orgId, st.id);
      const mapped = rows.map((c) => ({
        id: c.id,
        name: c.name,
        solarResource: c.solarResource,
      }));
      setGeoCities(mapped);
      const targetNorm = normalizeGeoName(parsed.cityName);
      const exact = mapped.find((c) => normalizeGeoName(c.name) === targetNorm);
      const fuzzy = mapped.find(
        (c) =>
          normalizeGeoName(c.name).includes(targetNorm) ||
          targetNorm.includes(normalizeGeoName(c.name))
      );
      const match = exact ?? fuzzy;
      if (match) setSelectedCity({ id: match.id, name: match.name });
    },
    []
  );

  const processUploadedBill = useCallback(
    async (
      uploaded: { fileUrl: string; fileName: string; mimeType: string; fileSize: number },
      displayName: string,
      orgId: string,
      leadId: string
    ): Promise<void> => {
      setBillAttachment({ status: "processing", message: "Lendo dados da fatura..." });
      const createdBill = await createEnergyBill(orgId, leadId, {
        fileUrl: uploaded.fileUrl,
        fileName: uploaded.fileName,
      });
      const bill = await waitForEnergyBillExtraction(orgId, leadId, createdBill.id);
      if (bill.extractionStatus === "FAILED") {
        const debugRaw =
          bill.extractedData?.rawData && typeof bill.extractedData.rawData === "object"
            ? (bill.extractedData.rawData as Record<string, unknown>)
            : undefined;
        const baseDebug = buildExtractionDebugHint(debugRaw);
        const fallbackDebug = buildExtractionFallbackDebug({
          billId: bill.id,
          status: bill.extractionStatus,
          extractedData: bill.extractedData,
        });
        setBillAttachment({
          status: "error",
          message:
            (bill.extractionError?.trim() ||
              "Não foi possível ler os dados da conta de luz automaticamente.") +
            (baseDebug || fallbackDebug),
        });
        return;
      }
      setBillAttachment({
        status: "ready",
        billId: bill.id,
        displayName,
        fileUrl: uploaded.fileUrl,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize,
        extractedData: bill.extractedData,
      });

      let states = geoStates;
      if (states.length === 0) {
        try {
          const rows = await listGeoStates(orgId);
          states = rows.map((s) => ({ id: s.id, uf: s.uf, name: s.name }));
          setGeoStates(states);
        } catch {
          return;
        }
      }
      const rawDataObj =
        bill.extractedData?.rawData && typeof bill.extractedData.rawData === "object"
          ? (bill.extractedData.rawData as Record<string, unknown>)
          : undefined;
      const rawLoc = resolveBillLocationString(rawDataObj);
      if (rawLoc) {
        await applyGeoFromBillLocation(orgId, rawLoc, states);
      }
    },
    [applyGeoFromBillLocation, geoStates]
  );

  const finalizePdfUpload = useCallback(
    async (
      originalFile: File,
      bytes: Uint8Array,
      orgId: string,
      leadId: string,
      pdfPassword?: string
    ) => {
      console.log("[energy-bill-pdf] finalizePdfUpload start", {
        name: originalFile.name,
        bytes: bytes.length,
        leadId,
        hasPassword: !!pdfPassword,
      });
      setBillAttachment({
        status: "processing",
        message: "Extraindo texto do PDF...",
      });
      let pdfText: string;
      try {
        pdfText = await extractPdfText(bytes, pdfPassword);
      } catch (err) {
        console.warn("[energy-bill-pdf] extractPdfText failed", {
          fileName: originalFile.name,
          message: err instanceof Error ? err.message : String(err),
        });
        setBillAttachment({
          status: "error",
          message:
            "Não foi possível ler o PDF. Exporte a conta sem senha ou envie uma imagem (JPG, PNG ou WEBP).",
        });
        return;
      }

      const textTrimLen = pdfText.trim().length;
      const textUsable = isBillPdfTextLayerUsable(pdfText);
      console.log("[energy-bill-pdf] pdf text layer", {
        fileName: originalFile.name,
        charCount: textTrimLen,
        usableForUpload: textUsable,
      });

      if (textUsable) {
        const blob = new Blob([pdfText], { type: "text/plain;charset=utf-8" });
        const { uploadFileName, displayLabel } = unlockedBillTextUploadName(originalFile.name);
        const uploadFile = new File([blob], uploadFileName, { type: "text/plain" });
        setBillAttachment({ status: "processing", message: "Enviando texto extraído da conta..." });
        try {
          const uploaded = await uploadEnergyBillFileToS3(orgId, leadId, uploadFile, "text/plain");
          console.log("[energy-bill-pdf] upload path=text/plain", {
            fileName: uploadFile.name,
            charCount: textTrimLen,
            leadId,
          });
          await processUploadedBill(uploaded, displayLabel, orgId, leadId);
        } catch (e) {
          console.warn("[energy-bill-pdf] text upload failed", {
            message: e instanceof Error ? e.message : String(e),
          });
          setBillAttachment({
            status: "error",
            message: e instanceof Error ? e.message : "Falha ao enviar texto da conta.",
          });
        }
        return;
      }

      console.log("[energy-bill-pdf] falling back to first-page PNG", {
        fileName: originalFile.name,
        charCount: textTrimLen,
      });
      setBillAttachment({
        status: "processing",
        message: "Texto do PDF insuficiente; gerando imagem da 1ª página...",
      });
      let pngBytes: Uint8Array;
      try {
        pngBytes = await renderFirstPdfPageToPng(bytes, pdfPassword);
      } catch (err) {
        console.warn("[energy-bill-pdf] renderFirstPdfPageToPng failed", {
          fileName: originalFile.name,
          message: err instanceof Error ? err.message : String(err),
        });
        setBillAttachment({
          status: "error",
          message:
            "Não foi possível converter o PDF. Exporte a conta sem senha ou envie uma imagem (JPG, PNG ou WEBP).",
        });
        return;
      }
      const pngBlob = new Blob([new Uint8Array(pngBytes)], { type: "image/png" });
      const { uploadFileName, displayLabel } = unlockedBillImageUploadName(originalFile.name);
      const uploadFile = new File([pngBlob], uploadFileName, { type: "image/png" });
      setBillAttachment({ status: "processing", message: "Enviando imagem da conta..." });
      try {
        const uploaded = await uploadEnergyBillFileToS3(orgId, leadId, uploadFile, "image/png");
        console.log("[energy-bill-pdf] upload path=image/png", {
          fileName: uploadFile.name,
          pngBytes: pngBytes.length,
          leadId,
        });
        await processUploadedBill(uploaded, displayLabel, orgId, leadId);
      } catch (e) {
        console.warn("[energy-bill-pdf] PNG upload failed", {
          message: e instanceof Error ? e.message : String(e),
        });
        setBillAttachment({
          status: "error",
          message: e instanceof Error ? e.message : "Falha ao enviar imagem da conta.",
        });
      }
    },
    [processUploadedBill]
  );

  const handleBillFileSelected = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      if (!currentOrganizationId || !proposalDeal?.leadId) {
        console.warn("[energy-bill-pdf] upload blocked — missing org or deal lead", {
          hasOrg: !!currentOrganizationId,
          hasLead: !!proposalDeal?.leadId,
          fileName: file.name,
        });
        setBillAttachment({
          status: "error",
          message: "Não foi possível enviar: organização ou cliente inválido.",
        });
        return;
      }

      const mime = guessEnergyBillContentType(file);
      const allowed =
        mime === "image/jpeg" ||
        mime === "image/png" ||
        mime === "image/webp" ||
        mime === "application/pdf" ||
        mime === "text/plain";
      if (!allowed) {
        setBillAttachment({
          status: "error",
          message: "Use imagem (JPG, PNG, WEBP), PDF ou TXT.",
        });
        return;
      }

      setProposalFieldErrors((prev) => ({ ...prev, contaLuz: undefined }));

      if (mime !== "application/pdf") {
        console.log("[energy-bill-pdf] non-PDF upload", { name: file.name, mime });
        setBillAttachment({ status: "processing", message: "Enviando arquivo..." });
        try {
          const uploaded = await uploadEnergyBillFileToS3(
            currentOrganizationId,
            proposalDeal.leadId,
            file,
            mime
          );
          await processUploadedBill(
            uploaded,
            file.name,
            currentOrganizationId,
            proposalDeal.leadId
          );
        } catch (e) {
          setBillAttachment({
            status: "error",
            message: e instanceof Error ? e.message : "Falha ao enviar arquivo.",
          });
        }
        return;
      }

      console.log("[energy-bill-pdf] PDF selected — open + extract flow", {
        name: file.name,
        size: file.size,
        leadId: proposalDeal.leadId,
      });
      setBillAttachment({ status: "processing", message: "Verificando PDF..." });
      let pdfBytes: Uint8Array;
      try {
        pdfBytes = new Uint8Array(await file.arrayBuffer());
      } catch {
        setBillAttachment({ status: "error", message: "Não foi possível ler o arquivo." });
        return;
      }

      try {
        await openPdfWithPdfJs(pdfBytes, undefined);
      } catch (e) {
        if (passwordExceptionNeedsPassword(e)) {
          console.log("[energy-bill-pdf] PDF requires password", { name: file.name });
          setBillAttachment({ status: "needs_password", file });
          setPdfPasswordInput("");
          return;
        }
        setBillAttachment({
          status: "error",
          message:
            e instanceof Error ? e.message : "PDF inválido ou corrompido. Tente outro arquivo.",
        });
        return;
      }

      await finalizePdfUpload(file, pdfBytes, currentOrganizationId, proposalDeal.leadId);
    },
    [currentOrganizationId, proposalDeal?.leadId, finalizePdfUpload, processUploadedBill]
  );

  const applyPdfPassword = useCallback(async () => {
    if (!currentOrganizationId || !proposalDeal?.leadId) return;
    if (billAttachment.status !== "needs_password") return;
    const file = billAttachment.file;
    const pwd = pdfPasswordInput.trim();
    if (!pwd) {
      setProposalFieldErrors((prev) => ({
        ...prev,
        contaLuz: "Informe a senha do PDF.",
      }));
      return;
    }
    setProposalFieldErrors((prev) => ({ ...prev, contaLuz: undefined }));

    setBillAttachment({ status: "processing", message: "Validando senha..." });
    let pdfBytes: Uint8Array;
    try {
      pdfBytes = new Uint8Array(await file.arrayBuffer());
    } catch {
      setBillAttachment({ status: "error", message: "Não foi possível ler o arquivo." });
      return;
    }

    try {
      await openPdfWithPdfJs(pdfBytes, pwd);
    } catch (e) {
      if (isPasswordException(e)) {
        setBillAttachment({ status: "needs_password", file });
        setProposalFieldErrors((prev) => ({
          ...prev,
          contaLuz: "Senha incorreta. Tente novamente.",
        }));
        return;
      }
      setBillAttachment({
        status: "error",
        message: e instanceof Error ? e.message : "Não foi possível abrir o PDF.",
      });
      return;
    }

    console.log("[energy-bill-pdf] password accepted, calling finalizePdfUpload");
    await finalizePdfUpload(file, pdfBytes, currentOrganizationId, proposalDeal.leadId, pwd);
  }, [
    billAttachment,
    pdfPasswordInput,
    currentOrganizationId,
    proposalDeal?.leadId,
    finalizePdfUpload,
  ]);

  async function createProposalFromPipelineModal(): Promise<void> {
    if (!currentOrganizationId || !proposalDeal || !generatedProposal?.dealId) return;
    setProposalCreateLoading(true);
    setProposalCreateError(null);
    try {
      const leadId = proposalDeal.leadId;
      const dealId = generatedProposal.dealId;
      const sysKw = Math.max(
        0.5,
        proposalKitResult?.system_power_kw ?? generatedProposal.tamanhoSistemaKw
      );
      const cityRow = geoCities.find((c) => c.id === selectedCity?.id);
      const billHistorySizing =
        billAttachment.status === "ready"
          ? sizingBillHistoryFromExtracted(billAttachment.extractedData)
          : {};
      const quickLike: SimulationResult = {
        economiaMensal: generatedProposal.economiaMensal,
        valorSistema: generatedProposal.valorSistema,
        payback: generatedProposal.payback,
        tamanhoSistema: generatedProposal.tamanhoSistemaKw,
        monthlyConsumptionKwh: generatedProposal.monthlyConsumptionKwh,
      };
      const persistedDraft = quickResultToPersistedSimulationDraft(quickLike, {
        sizingExtras: billHistorySizing,
        solarResource: cityRow?.solarResource,
      });
      const organizationCostRules = await listCostRules(currentOrganizationId);

      const kitForProposal = proposalKitResult
        ? {
            ...proposalKitResult,
            kit_items: proposalKitResult.kit_items.map((item) => {
              const raw = kitQtyDraftsRef.current[item.product_id];
              const parsed = raw != null ? parseInt(raw, 10) : NaN;
              return Number.isFinite(parsed) && parsed >= 1 ? { ...item, quantity: parsed } : item;
            }),
          }
        : null;

      let freight: { state: string; valueBrl: number } | undefined;
      if (proposalKitResult?.own_stock_used && selectedState?.uf) {
        try {
          const freightRules = await getStockFreightRules(currentOrganizationId);
          const rule = freightRules.find((r) => r.state === selectedState.uf.toUpperCase());
          if (rule && rule.value > 0) freight = { state: rule.state, valueBrl: rule.value };
        } catch {}
      }

      const renderedData = buildProposalIntegratorRenderedData(
        kitForProposal,
        Math.max(1000, Math.round(generatedProposal.valorSistema)),
        generatedProposal.estimateNote,
        {
          organizationRules: organizationCostRules,
          systemKwp: sysKw,
          ...(proposalKitResult?.own_stock_used ? { sourceType: "own_stock" as const } : {}),
          ...(freight ? { freight } : {}),
        }
      );

      const investmentFromRules = Math.round(
        (renderedData as { integrator: { quotedSaleBrl: number } }).integrator.quotedSaleBrl
      );

      const sim = await createLeadFinancialSimulation(currentOrganizationId, leadId, {
        input: {
          ...persistedDraft,
          systemSizeKw: sysKw,
          investmentAmount: Math.max(1000, investmentFromRules),
        },
        name: `Funil — ${proposalDeal.clientName}`,
      });

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      const created = await createProposalForDeal(currentOrganizationId, dealId, {
        simulationId: sim.id,
        title: `Proposta solar — ${proposalDeal.clientName}`,
        validUntil: validUntil.toISOString(),
        renderedData: renderedData as Record<string, unknown>,
        ...(proposalDiscount != null && proposalDiscount > 0
          ? { discountBrl: proposalDiscount }
          : {}),
      });

      sync?.updateDealProposalStatus(proposalDeal.id, true);
      setProposalResultOpen(false);
      router.push(`/propostas/${created.id}`);
    } catch (e) {
      setProposalCreateError(e instanceof Error ? e.message : "Não foi possível criar a proposta.");
    } finally {
      setProposalCreateLoading(false);
    }
  }
  async function runProposalFlow(
    deal: Deal,
    input: SimulationInput,
    opts?: {
      source?: "automatic" | "manual" | "upload";
      energyBill?: {
        billId?: string;
        fileUrl: string;
        fileName: string;
        extractedData?: EnergyBillExtractedPayload | null;
      };
    }
  ): Promise<void> {
    if (!currentOrganizationId) return;
    setProposalLoading(true);
    setProposalError(null);
    try {
      const roof = input.roofType ?? "ceramic";
      let simulationInput: SimulationInput = { ...input, roofType: roof };
      let proposalEstimateNote: string | undefined;

      if (opts?.energyBill) {
        const ex = opts.energyBill.extractedData ?? null;
        const debugRaw =
          ex?.rawData && typeof ex.rawData === "object"
            ? (ex.rawData as Record<string, unknown>)
            : undefined;
        const prepared = prepareQuickEconomiaFromExtracted(ex, {
          irradiacao: input.irradiacao,
          roofType: roof,
        });
        if (!prepared.ok) {
          const baseDebug = buildExtractionDebugHint(debugRaw);
          const fallbackDebug = buildExtractionFallbackDebug({
            billId: opts.energyBill.billId ?? "unknown",
            status: "COMPLETED",
            extractedData: ex,
          });
          throw new Error(prepared.error + (baseDebug || fallbackDebug));
        }
        simulationInput = prepared.input;
        proposalEstimateNote = prepared.estimateNote;
      }

      const result = simulateProposal(simulationInput);
      const leadDetail = await getLead(currentOrganizationId, deal.leadId);
      let targetDealId = deal.dealId;

      if (!targetDealId) {
        const createdDeal = await createDeal(currentOrganizationId, deal.leadId, {
          title: buildSystemDealTitle(result.tamanhoSistema),
          value: result.valorSistema ?? deal.value ?? 0,
          stage: "PROPOSAL",
          temperature: "WARM",
        });
        targetDealId = createdDeal.id;
      }

      const cityRowForSim = geoCities.find((c) => c.id === selectedCity?.id);
      const billHistorySizing = sizingBillHistoryFromExtracted(
        opts?.energyBill ? (opts.energyBill.extractedData ?? null) : null
      );
      const persistedDraft = quickResultToPersistedSimulationDraft(result, {
        sizingExtras: billHistorySizing,
        solarResource: cityRowForSim?.solarResource,
      });
      await createLeadFinancialSimulation(currentOrganizationId, leadDetail.id, {
        input: persistedDraft,
        name: `Funil — ${deal.clientName}`,
      });

      const billLabelForDeal =
        billAttachment.status === "ready" ? billAttachment.displayName : "arquivo";

      const computedDealValue = result.valorSistema ?? deal.value ?? 0;
      await patchDeal(currentOrganizationId, targetDealId, {
        stage: "PROPOSAL",
        ...(Number.isFinite(computedDealValue) && computedDealValue > 0
          ? { value: computedDealValue }
          : {}),
        nextActionType:
          opts?.source === "upload"
            ? `Pré-cálculo gerado via conta enviada (${billLabelForDeal})`
            : "Pré-cálculo de economia gerado automaticamente",
      });

      sync?.updateDealStage(deal.id, "proposta");

      const proposalId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      setGeneratedProposal({
        id: proposalId,
        dealId: targetDealId,
        economiaMensal: result.economiaMensal,
        valorSistema: result.valorSistema,
        payback: result.payback,
        status: "generated",
        createdAt: new Date(),
        estimateNote: proposalEstimateNote,
        tamanhoSistemaKw: result.tamanhoSistema,
        roofType: roof,
        monthlyConsumptionKwh: result.monthlyConsumptionKwh,
      });
      setProposalResultOpen(true);
      setProposalFormOpen(false);
      proposalStudyBridge.notifyStudyComplete();
    } catch (e) {
      setProposalError(e instanceof Error ? e.message : "Erro ao gerar proposta");
    } finally {
      setProposalLoading(false);
    }
  }
  function resetProposalForm(): void {
    setInputConsumption("");
    setInputBillValue(null);
    setInputSystemKw("");
    setManualSizingBasis("consumption");
    setSelectedState(null);
    setSelectedCity(null);
    setGeoCities([]);
    setRoofType("");
    setBillAttachment({ status: "none" });
    setPdfPasswordInput("");
    setProposalError(null);
    setProposalFieldErrors({});
    setProposalInputMode("upload");
  }
  async function handleCreateProposalClick(
    deal: Deal,
    _opts?: { forceStudyModal?: boolean }
  ): Promise<void> {
    if (!currentOrganizationId) return;
    setProposalDeal(deal);
    setProposalError(null);
    resetProposalForm();
    setProposalFormOpen(true);
  }

  const handleCreateProposalClickRef = useRef(handleCreateProposalClick);
  handleCreateProposalClickRef.current = handleCreateProposalClick;
  const handleBillFileSelectedRef = useRef(handleBillFileSelected);
  handleBillFileSelectedRef.current = handleBillFileSelected;

  useImperativeHandle(ref, () => ({
    openFromDeal: async (deal, opts) => {
      await handleCreateProposalClickRef.current(deal, opts);
    },
    openFromLeadId: async (leadId, opts) => {
      if (!currentOrganizationId) return;
      try {
        const detail = await getLead(currentOrganizationId, leadId);
        const deal = buildDealFromLeadDetail(detail);
        await handleCreateProposalClickRef.current(deal, opts);
      } catch {}
    },
    openWithFile: async (deal, file) => {
      await handleCreateProposalClickRef.current(deal, { forceStudyModal: true });
      await new Promise((r) => setTimeout(r, 50));
      await handleBillFileSelectedRef.current(file);
    },
  }));

  const effectiveKitQty = useCallback(
    (item: { product_id: string; quantity: number }): number => {
      const raw = kitQtyDrafts[item.product_id];
      if (raw == null) return item.quantity;
      const parsed = parseInt(raw, 10);
      return Number.isFinite(parsed) && parsed >= 1 ? parsed : item.quantity;
    },
    [kitQtyDrafts]
  );

  const effectiveKitItems = useMemo(
    () =>
      (proposalKitResult?.kit_items ?? []).map((item) => ({
        ...item,
        quantity: effectiveKitQty(item),
      })),
    [proposalKitResult, effectiveKitQty]
  );

  function adjustModuleQuantity(deltaQty: number): void {
    if (!proposalKitResult) return;
    const perModuleKw = proposalKitResult.system_power_kw / proposalKitResult.modules.quantity;
    if (!Number.isFinite(perModuleKw) || perModuleKw <= 0) return;
    const draftKw = parseFloat(proposalKitDraft.systemKw.replace(",", "."));
    const baseKw =
      Number.isFinite(draftKw) && draftKw > 0 ? draftKw : proposalKitResult.system_power_kw;
    const currentQty = Math.max(1, Math.ceil(baseKw / perModuleKw - 1e-6));
    const targetQty = Math.max(1, currentQty + deltaQty);
    const kw = Math.min(1000, Math.max(0.5, Math.floor(targetQty * perModuleKw * 100) / 100));
    setProposalKitDraft((d) => ({ ...d, systemKw: String(kw) }));
  }

  const kitDraftSource = proposalKitDraft.source;
  const ownStockOption = kitSourceOptions?.find((s) => s.type === "own_stock") ?? null;
  const supplierOptions = (kitSourceOptions ?? []).filter(
    (s): s is KitSourceOption & { supplier_id: string } =>
      s.type === "supplier" && typeof s.supplier_id === "string"
  );
  const selectedSupplierName =
    kitDraftSource.kind === "supplier"
      ? (supplierOptions.find((s) => s.supplier_id === kitDraftSource.id)?.supplier_name ?? null)
      : null;

  if (!currentOrganizationId) {
    return null;
  }

  return (
    <>
      <Dialog
        open={proposalFormOpen}
        onOpenChange={(open) => {
          setProposalFormOpen(open);
          if (!open) {
            resetProposalForm();
            setProposalDeal(null);
          }
        }}
      >
        <DialogContent
          muiMaxWidth="md"
          stickyChrome
          className="flex max-h-[min(92vh,calc(100dvh-2rem))] flex-col overflow-hidden rounded-3xl p-0"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <DialogHeader className="shrink-0 space-y-2 border-b border-[var(--color-border)] bg-[var(--color-background)] px-5 pb-4 pt-6 sm:px-8 sm:pb-5 sm:pt-7">
              <DialogTitle className="flex items-start gap-2.5 text-lg font-semibold leading-tight tracking-tight sm:items-center sm:text-2xl">
                <Zap className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 sm:mt-0" />
                <span className="min-w-0">Economia do cliente em segundos</span>
              </DialogTitle>
              <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)] sm:text-[1.05rem]">
                Envie a conta de luz do cliente para gerar uma estimativa rapida e fortalecer sua
                abordagem comercial com dados claros.
              </p>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-6">
              <div className="space-y-5">
                {proposalError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{proposalError}</p>
                ) : null}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                        proposalInputMode === "upload"
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-background)]"
                      }`}
                      onClick={() => {
                        setProposalInputMode("upload");
                        setProposalFieldErrors({});
                      }}
                    >
                      <Upload className="h-4 w-4" />
                      Enviar conta
                    </button>
                    <button
                      type="button"
                      className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition ${
                        proposalInputMode === "manual"
                          ? "bg-[var(--color-background)] text-[var(--color-foreground)] shadow-sm"
                          : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-background)]"
                      }`}
                      onClick={() => {
                        setProposalInputMode("manual");
                        setProposalFieldErrors({});
                        setBillAttachment({ status: "none" });
                        setPdfPasswordInput("");
                      }}
                    >
                      Preencher manualmente
                    </button>
                  </div>
                </div>
                <div className="grid gap-5">
                  {proposalInputMode === "upload" ? (
                    <div className="grid gap-3">
                      <Label className="text-sm">Conta de luz (imagem ou PDF)</Label>
                      <div
                        role="button"
                        tabIndex={0}
                        className={`relative rounded-2xl border-2 border-dashed px-4 py-6 transition sm:px-6 sm:py-8 ${
                          isUploadDragActive
                            ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                            : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-emerald-300"
                        }`}
                        onClick={() => {
                          if (billAttachment.status === "processing") return;
                          billFileInputRef.current?.click();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            if (billAttachment.status !== "processing") {
                              billFileInputRef.current?.click();
                            }
                          }
                        }}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setIsUploadDragActive(true);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setIsUploadDragActive(true);
                        }}
                        onDragLeave={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setIsUploadDragActive(false);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setIsUploadDragActive(false);
                          const file = event.dataTransfer.files?.[0];
                          void handleBillFileSelected(file);
                        }}
                      >
                        {billAttachment.status === "processing" ? (
                          <div
                            className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-violet-500/15 bg-[var(--color-card)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] dark:border-violet-400/20 dark:bg-[var(--color-background)]"
                            role="status"
                            aria-live="polite"
                          >
                            <div
                              className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-40"
                              aria-hidden
                            >
                              <div className="absolute -left-1/4 top-0 h-40 w-40 rounded-full bg-violet-500/25 blur-3xl dark:bg-violet-400/20" />
                              <div className="absolute -right-1/4 bottom-0 h-40 w-40 rounded-full bg-emerald-500/25 blur-3xl dark:bg-emerald-400/15" />
                              <div className="absolute left-1/2 top-1/2 h-px w-[120%] -translate-x-1/2 -translate-y-1/2 rotate-12 bg-gradient-to-r from-transparent via-violet-400/20 to-transparent dark:via-violet-300/15" />
                            </div>
                            <div className="relative flex max-w-sm flex-col items-center gap-3.5 px-6 text-center">
                              <div className="relative">
                                <div className="absolute inset-0 animate-ping rounded-2xl bg-emerald-400/15 [animation-duration:2s]" />
                                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-violet-500/15 via-[var(--color-card)] to-emerald-500/15 shadow-lg shadow-emerald-900/5 dark:from-violet-400/10 dark:shadow-black/20">
                                  <Sparkles className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <Loader2
                                  className="absolute -bottom-0.5 -right-0.5 h-5 w-5 text-violet-600 motion-safe:animate-spin dark:text-violet-400"
                                  aria-hidden
                                />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-violet-600/95 dark:text-violet-400/95">
                                  Análise com IA
                                </p>
                                <p className="text-sm font-medium leading-snug text-[var(--color-foreground)]">
                                  {billAttachment.message}
                                </p>
                              </div>
                              <div className="h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-[var(--color-muted)]">
                                <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-500 via-violet-500 to-emerald-500 bg-[length:200%_100%] animate-shimmer" />
                              </div>
                            </div>
                          </div>
                        ) : null}
                        <input
                          ref={billFileInputRef}
                          type="file"
                          accept="image/*,.pdf,.txt,text/plain"
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            void handleBillFileSelected(file);
                            event.currentTarget.value = "";
                          }}
                        />
                        {billAttachment.status === "needs_password" ? (
                          <div
                            className="mx-auto flex w-full max-w-sm flex-col items-stretch gap-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            role="presentation"
                          >
                            <p className="text-sm font-medium text-[var(--color-foreground)]">
                              Este PDF está protegido por senha
                            </p>
                            <p className="text-xs text-[var(--color-muted-foreground)]">
                              Informe a senha de abertura para continuar.
                            </p>
                            <Input
                              type="password"
                              value={pdfPasswordInput}
                              onChange={(e) => setPdfPasswordInput(e.target.value)}
                              placeholder="Senha do PDF"
                              autoComplete="off"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void applyPdfPassword();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              className="w-full"
                              onClick={() => void applyPdfPassword()}
                            >
                              Aplicar senha
                            </Button>
                            <button
                              type="button"
                              className="text-xs text-emerald-600 underline underline-offset-2 dark:text-emerald-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBillAttachment({ status: "none" });
                                setPdfPasswordInput("");
                                setProposalFieldErrors((prev) => ({
                                  ...prev,
                                  contaLuz: undefined,
                                }));
                              }}
                            >
                              Escolher outro arquivo
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2.5 text-center">
                            <div className="rounded-full bg-[var(--color-muted)] p-3">
                              <Upload className="h-6 w-6 text-[var(--color-muted-foreground)]" />
                            </div>
                            <p className="text-xl font-semibold">
                              Arraste e solte aqui ou{" "}
                              <span className="text-emerald-600">selecione o arquivo</span>
                            </p>
                            <p className="text-sm text-[var(--color-muted-foreground)]">
                              Formatos aceitos: imagem ou PDF da conta do cliente
                            </p>
                          </div>
                        )}
                      </div>
                      {billAttachment.status === "ready" ? (
                        <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
                          <div className="flex items-center gap-2 font-medium">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              Upload concluído: {billAttachment.displayName}
                            </span>
                          </div>
                          <img
                            src={billAttachment.fileUrl}
                            alt="Conta enviada"
                            className="max-h-36 w-full rounded-lg border border-emerald-500/20 object-contain bg-white sm:max-h-52"
                          />
                          <dl className="grid gap-1.5 text-xs">
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              <dt className="font-medium text-[var(--color-foreground)]">
                                ID da fatura
                              </dt>
                              <dd className="text-[var(--color-muted-foreground)]">
                                {billAttachment.billId}
                              </dd>
                            </div>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              <dt className="font-medium text-[var(--color-foreground)]">
                                Consumo (kWh)
                              </dt>
                              <dd className="text-[var(--color-muted-foreground)]">
                                {formatExtractionValue(
                                  billAttachment.extractedData?.consumptionKwh
                                )}
                              </dd>
                            </div>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              <dt className="font-medium text-[var(--color-foreground)]">
                                Total (R$)
                              </dt>
                              <dd className="text-[var(--color-muted-foreground)]">
                                {formatExtractionValue(billAttachment.extractedData?.totalAmount)}
                              </dd>
                            </div>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              <dt className="font-medium text-[var(--color-foreground)]">
                                Referência
                              </dt>
                              <dd className="text-[var(--color-muted-foreground)]">
                                {formatExtractionValue(
                                  billAttachment.extractedData?.referenceMonth
                                )}
                              </dd>
                            </div>
                            {(() => {
                              const gds = getBillGdSimulationSummary(billAttachment.extractedData);
                              if (!gds) return null;
                              return (
                                <div className="flex flex-col gap-1 border-t border-emerald-500/15 pt-2 text-[0.7rem] leading-snug">
                                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                    <dt className="font-medium text-[var(--color-foreground)]">
                                      GD — consumo rede (kWh)
                                    </dt>
                                    <dd className="tabular-nums text-[var(--color-muted-foreground)]">
                                      {gds.grid.toLocaleString("pt-BR")}
                                    </dd>
                                  </div>
                                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                    <dt className="font-medium text-[var(--color-foreground)]">
                                      GD — injetado/gerado (kWh)
                                    </dt>
                                    <dd className="tabular-nums text-[var(--color-muted-foreground)]">
                                      {gds.injected.toLocaleString("pt-BR")}
                                    </dd>
                                  </div>
                                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                    <dt className="font-medium text-[var(--color-foreground)]">
                                      Base p/ simulação (kWh/mês)
                                    </dt>
                                    <dd className="font-semibold tabular-nums text-[var(--color-foreground)]">
                                      ≈ {gds.combined.toLocaleString("pt-BR")}
                                    </dd>
                                  </div>
                                  <p className="text-[0.65rem] text-[var(--color-muted-foreground)]">
                                    Base líquida na rede: consumo faturado na rede menos energia
                                    injetada/gerada no período (aprox.).
                                  </p>
                                </div>
                              );
                            })()}
                          </dl>
                          {getBillExtractionUiNotes(billAttachment.extractedData?.rawData).map(
                            (note, i) => (
                              <p
                                key={`${note.kind}-${i}`}
                                className={
                                  note.kind === "distributed_generation"
                                    ? "text-[0.7rem] leading-snug text-amber-950/90 dark:text-amber-100/85"
                                    : "text-[0.7rem] leading-snug text-emerald-950/90 dark:text-emerald-100/85"
                                }
                              >
                                {note.text}
                              </p>
                            )
                          )}
                        </div>
                      ) : null}
                      {billAttachment.status === "error" ? (
                        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                          {billAttachment.message}
                        </p>
                      ) : null}
                      {proposalFieldErrors.contaLuz ? (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {proposalFieldErrors.contaLuz}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {}
                      <div className="grid gap-1.5">
                        <Label className="text-sm font-semibold">Dimensionar por</Label>
                        <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-1.5">
                          <button
                            type="button"
                            className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition ${
                              manualSizingBasis === "consumption"
                                ? "bg-[var(--color-background)] text-[var(--color-foreground)] shadow-sm"
                                : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-background)]"
                            }`}
                            onClick={() => {
                              setManualSizingBasis("consumption");
                              setProposalFieldErrors((prev) => ({
                                ...prev,
                                consumo: undefined,
                                systemKw: undefined,
                                valorConta: undefined,
                              }));
                            }}
                          >
                            Consumo (kWh)
                          </button>
                          <button
                            type="button"
                            className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition ${
                              manualSizingBasis === "power"
                                ? "bg-[var(--color-background)] text-[var(--color-foreground)] shadow-sm"
                                : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-background)]"
                            }`}
                            onClick={() => {
                              setManualSizingBasis("power");
                              setProposalFieldErrors((prev) => ({
                                ...prev,
                                consumo: undefined,
                                systemKw: undefined,
                                valorConta: undefined,
                              }));
                            }}
                          >
                            Potência (kWp)
                          </button>
                        </div>
                        <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                          {manualSizingBasis === "power"
                            ? "Já sabe o tamanho do sistema? Informe a potência e o valor da conta para estimar a economia."
                            : "Informe o consumo mensal ou o valor da conta — a potência é dimensionada automaticamente."}
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {manualSizingBasis === "power" ? (
                          <div className="grid gap-1.5 sm:col-span-1">
                            <Label>Potência do sistema (kWp)</Label>
                            <Input
                              value={inputSystemKw}
                              onChange={(e) => {
                                setInputSystemKw(e.target.value);
                                setProposalFieldErrors((prev) => ({
                                  ...prev,
                                  systemKw: undefined,
                                }));
                              }}
                              placeholder="Ex: 5,5"
                              inputMode="decimal"
                            />
                            {proposalFieldErrors.systemKw ? (
                              <p className="text-xs text-red-600 dark:text-red-400">
                                {proposalFieldErrors.systemKw}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <div className="grid gap-1.5 sm:col-span-1">
                            <Label>Consumo mensal (kWh)</Label>
                            <Input
                              value={inputConsumption}
                              onChange={(e) => {
                                setInputConsumption(e.target.value);
                                setProposalFieldErrors((prev) => ({ ...prev, consumo: undefined }));
                              }}
                              placeholder="Ex: 420"
                              inputMode="decimal"
                            />
                            {proposalFieldErrors.consumo ? (
                              <p className="text-xs text-red-600 dark:text-red-400">
                                {proposalFieldErrors.consumo}
                              </p>
                            ) : null}
                          </div>
                        )}
                        <div className="grid gap-1.5 sm:col-span-1">
                          <Label>Valor da conta (R$)</Label>
                          <CurrencyInput
                            value={inputBillValue}
                            onValueChange={(v) => {
                              setInputBillValue(v);
                              setProposalFieldErrors((prev) => ({
                                ...prev,
                                valorConta: undefined,
                              }));
                            }}
                          />
                          {proposalFieldErrors.valorConta ? (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              {proposalFieldErrors.valorConta}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="grid gap-4 border-t border-[var(--color-border)] pt-4">
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/15 px-3 py-2.5 sm:px-4">
                      <Label className="text-sm font-semibold">Local e incidência solar</Label>
                      <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                        Preenchido automaticamente quando a fatura traz cidade/UF; ajuste se
                        necessário.
                      </p>
                      <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                        Base heurística:{" "}
                        <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                          {heuristicaIrradiacao}
                        </span>
                        <span className="text-[var(--color-muted-foreground)]">
                          {" "}
                          —{" "}
                          {irradiacaoFromSolarResource(
                            geoCities.find((c) => c.id === selectedCity?.id)?.solarResource
                          ) != null
                            ? "Atlas INPE (cidade)"
                            : selectedCity
                              ? "estimativa (sem Atlas)"
                              : "padrão (sem cidade)"}
                        </span>
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label>UF</Label>
                        <Autocomplete
                          options={geoStates}
                          value={selectedState}
                          onChange={(_, value) => {
                            setSelectedState(value);
                            setSelectedCity(null);
                          }}
                          getOptionLabel={(option) => `${option.uf} - ${option.name}`}
                          loading={geoLoading}
                          disablePortal
                          slotProps={{
                            popper: {
                              style: { zIndex: 1400 },
                            },
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              size="small"
                              placeholder="Buscar estado"
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {geoLoading ? (
                                      <CircularProgress size={16} color="inherit" />
                                    ) : null}
                                    {params.InputProps.endAdornment}
                                  </>
                                ),
                              }}
                            />
                          )}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Cidade</Label>
                        <Autocomplete
                          options={geoCities}
                          value={selectedCity}
                          onChange={(_, value) => setSelectedCity(value)}
                          getOptionLabel={(option) => option.name}
                          loading={geoLoading}
                          disabled={!selectedState}
                          disablePortal
                          slotProps={{
                            popper: {
                              style: { zIndex: 1400 },
                            },
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              size="small"
                              placeholder={
                                selectedState ? "Buscar cidade" : "Selecione uma UF antes"
                              }
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {geoLoading ? (
                                      <CircularProgress size={16} color="inherit" />
                                    ) : null}
                                    {params.InputProps.endAdornment}
                                  </>
                                ),
                              }}
                            />
                          )}
                        />
                      </div>
                    </div>
                    <div className="grid gap-1.5 sm:max-w-md">
                      <Label>
                        Tipo de telhado{" "}
                        <span className="text-red-600 dark:text-red-400" aria-hidden>
                          *
                        </span>
                      </Label>
                      <Autocomplete
                        options={ROOF_TYPE_SELECT_OPTIONS}
                        value={
                          roofType
                            ? (ROOF_TYPE_SELECT_OPTIONS.find((o) => o.value === roofType) ?? null)
                            : null
                        }
                        onChange={(_, value) => {
                          setRoofType(value?.value ?? "");
                          setProposalFieldErrors((prev) => ({ ...prev, roofType: undefined }));
                        }}
                        getOptionLabel={(option) => option.label}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        disablePortal
                        slotProps={{
                          popper: {
                            style: { zIndex: 1400 },
                          },
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            placeholder="Selecione o tipo de telhado"
                            error={Boolean(proposalFieldErrors.roofType)}
                            helperText={proposalFieldErrors.roofType}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3.5 py-2.5 text-xs leading-snug text-[var(--color-muted-foreground)]">
                  <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Os dados do cliente sao protegidos e usados apenas para gerar a simulacao de
                    economia.
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter className="shrink-0 flex-row flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-background)] px-5 py-4 sm:gap-3 sm:px-8 sm:py-5">
              <Button
                variant="ghost"
                className="text-[var(--color-muted-foreground)]"
                onClick={() => setProposalFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="h-11 rounded-xl px-6 text-base font-semibold"
                disabled={proposalLoading}
                onClick={() => {
                  const fieldErrors: ProposalFieldErrors = {};
                  if (!proposalDeal) return;
                  const consumo = Number(inputConsumption.replace(",", "."));
                  const valorConta = inputBillValue ?? NaN;
                  const systemKw = Number(inputSystemKw.replace(",", "."));
                  const hasConsumptionInput = inputConsumption.trim().length > 0;
                  const hasBillInput = inputBillValue !== null;
                  const hasKwInput = inputSystemKw.trim().length > 0;
                  const hasConsumo = Number.isFinite(consumo) && consumo > 0;
                  const hasConta = Number.isFinite(valorConta) && valorConta > 0;
                  const hasKw = Number.isFinite(systemKw) && systemKw > 0;
                  const hasUpload = billAttachment.status === "ready";
                  const isPowerBasis =
                    proposalInputMode === "manual" && manualSizingBasis === "power";

                  if (!roofType) {
                    fieldErrors.roofType = "Selecione o tipo de telhado.";
                  }

                  if (proposalInputMode === "upload") {
                    if (!hasUpload) {
                      fieldErrors.contaLuz = "Envie a conta de luz para continuar.";
                    }
                  } else if (isPowerBasis) {
                    if (!hasKwInput || !hasKw) {
                      fieldErrors.systemKw = "Informe a potência do sistema (kWp).";
                    } else if (systemKw < 0.5 || systemKw > 1000) {
                      fieldErrors.systemKw = "Informe uma potência entre 0,5 e 1000 kWp.";
                    }
                    if (hasBillInput && !hasConta) {
                      fieldErrors.valorConta = "Informe um valor de conta valido.";
                    } else if (!hasConta) {
                      fieldErrors.valorConta = "Informe o valor da conta para estimar a economia.";
                    }
                  } else {
                    if (hasConsumptionInput && !hasConsumo) {
                      fieldErrors.consumo = "Informe um consumo mensal valido.";
                    }
                    if (hasBillInput && !hasConta) {
                      fieldErrors.valorConta = "Informe um valor de conta valido.";
                    }
                    if (!hasConsumo && !hasConta) {
                      fieldErrors.consumo =
                        fieldErrors.consumo ?? "Preencha consumo ou valor da conta.";
                      fieldErrors.valorConta =
                        fieldErrors.valorConta ?? "Preencha consumo ou valor da conta.";
                    }
                  }

                  if (
                    fieldErrors.consumo ||
                    fieldErrors.valorConta ||
                    fieldErrors.systemKw ||
                    fieldErrors.contaLuz ||
                    fieldErrors.roofType
                  ) {
                    setProposalFieldErrors(fieldErrors);
                    return;
                  }
                  setProposalFieldErrors({});
                  const cityRow = geoCities.find((c) => c.id === selectedCity?.id);
                  const irr =
                    irradiacaoFromSolarResource(cityRow?.solarResource) ??
                    (selectedCity ? 145 : undefined);
                  void runProposalFlow(
                    proposalDeal,
                    {
                      consumo:
                        proposalInputMode === "manual" && !isPowerBasis && hasConsumo
                          ? consumo
                          : undefined,
                      valorConta:
                        proposalInputMode === "manual" && hasConta ? valorConta : undefined,
                      systemKw: isPowerBasis && hasKw ? systemKw : undefined,
                      irradiacao: irr,
                      roofType: roofType as RoofType,
                    },
                    {
                      source: proposalInputMode === "upload" ? "upload" : "manual",
                      ...(proposalInputMode === "upload" && billAttachment.status === "ready"
                        ? {
                            energyBill: {
                              billId: billAttachment.billId,
                              fileUrl: billAttachment.fileUrl,
                              fileName: billAttachment.fileName,
                              extractedData: billAttachment.extractedData,
                            },
                          }
                        : {}),
                    }
                  );
                }}
              >
                <Zap className="mr-1.5 h-4 w-4" />
                {proposalLoading
                  ? proposalInputMode === "upload"
                    ? "Lendo a conta e calculando..."
                    : "Calculando estimativa..."
                  : "Calcular economia do cliente"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={proposalResultOpen}
        onOpenChange={(open) => {
          setProposalResultOpen(open);
          if (!open) {
            setGeneratedProposal(null);
            setProposalDeal(null);
            setProposalError(null);
            setProposalKitRequest(null);
            setProposalKitResult(null);
            setProposalKitWhatsapp(null);
            setProposalKitError(null);
            setProposalKitCopied(false);
            setProposalLinkCopied(false);
            setShareMenuAnchor(null);
            setProposalCreateError(null);
            setProposalCreateLoading(false);
            setProposalDiscount(null);
          }
        }}
      >
        <DialogContent
          muiMaxWidth="md"
          allowOverflow
          className="max-h-[min(92vh,calc(100dvh-2rem))] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 shrink-0 text-emerald-500" />
              Simulação e kit solar
            </DialogTitle>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Dimensionamento a partir do consumo estimado na etapa anterior. Ajuste telhado, marca
              dos painéis ou potência — o kit é recalculado automaticamente.
            </p>
          </DialogHeader>
          {generatedProposal ? (
            <div className="space-y-5 py-1">
              <div className="grid gap-3 rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.06] via-[var(--color-muted)]/20 to-violet-500/[0.05] p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Consumo base (kWh/mês)
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-[var(--color-foreground)]">
                    {Math.round(generatedProposal.monthlyConsumptionKwh).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Economia mensal (est.)
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-[var(--color-foreground)]">
                    {formatCurrency(generatedProposal.economiaMensal)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                    Payback (est.)
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-[var(--color-foreground)]">
                    {generatedProposal.payback.toFixed(1)} anos
                  </p>
                </div>
                <div className="sm:col-span-3">
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Valor do sistema (heurístico):{" "}
                    <span className="font-semibold text-[var(--color-foreground)]">
                      {formatCurrency(generatedProposal.valorSistema)}
                    </span>
                    {" · "}
                    Potência alvo inicial:{" "}
                    <span className="font-semibold text-[var(--color-foreground)]">
                      {clampSystemKw(generatedProposal.tamanhoSistemaKw).toLocaleString("pt-BR", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}{" "}
                      kWp
                    </span>
                  </p>
                </div>
                <div className="sm:col-span-3">
                  <CurrencyInput
                    id="proposal-discount"
                    label="Desconto comercial (opcional)"
                    value={proposalDiscount}
                    onValueChange={setProposalDiscount}
                    helperText="Aparece como linha separada na proposta do cliente (valor cheio − desconto = total). Deixe vazio para não aplicar."
                  />
                </div>
              </div>

              {generatedProposal.estimateNote ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {generatedProposal.estimateNote}
                </p>
              ) : null}

              <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-[var(--color-card)] shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] dark:shadow-none">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"
                  aria-hidden
                />
                <div className="relative space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-emerald-600/90 dark:text-emerald-400/90">
                        Dimensionamento
                      </p>
                      <h3 className="mt-0.5 text-base font-semibold text-[var(--color-foreground)]">
                        Ajustar kit
                      </h3>
                      <p className="mt-1 max-w-lg text-xs text-[var(--color-muted-foreground)]">
                        Altere potência, telhado ou marca dos módulos — o kit é recalculado
                        automaticamente.
                      </p>
                    </div>
                    <Sparkles
                      className="hidden h-8 w-8 shrink-0 text-violet-500/35 sm:block"
                      aria-hidden
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="proposal-kit-kw">Potência do sistema (kWp)</Label>
                      <Input
                        id="proposal-kit-kw"
                        type="text"
                        inputMode="decimal"
                        className="h-11 border-emerald-500/15 bg-[var(--color-background)] font-medium tabular-nums"
                        value={proposalKitDraft.systemKw}
                        onChange={(e) =>
                          setProposalKitDraft((d) => ({ ...d, systemKw: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="proposal-kit-roof">Tipo de telhado</Label>
                      <Select
                        id="proposal-kit-roof"
                        className="[&_.MuiOutlinedInput-notchedOutline]:border-emerald-500/15"
                        value={proposalKitDraft.roof}
                        onChange={(e) =>
                          setProposalKitDraft((d) => ({
                            ...d,
                            roof: e.target.value as RoofType,
                          }))
                        }
                      >
                        {ROOF_TYPE_SELECT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="proposal-kit-brand">Marca dos painéis</Label>
                      <Select
                        id="proposal-kit-brand"
                        className="[&_.MuiOutlinedInput-notchedOutline]:border-emerald-500/15"
                        value={proposalKitDraft.brandPreset}
                        onChange={(e) =>
                          setProposalKitDraft((d) => ({
                            ...d,
                            brandPreset: e.target.value,
                            pins: { ...d.pins, moduleId: undefined },
                          }))
                        }
                      >
                        {MODULE_BRAND_SELECT_OPTIONS.map((o) => (
                          <option key={o.value || "any"} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    {proposalKitDraft.brandPreset === "__custom__" ? (
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="proposal-kit-brand-custom">Nome da marca</Label>
                        <Input
                          id="proposal-kit-brand-custom"
                          type="text"
                          placeholder="Ex.: Canadian Solar"
                          className="h-11 border-emerald-500/15"
                          value={proposalKitDraft.brandCustom}
                          onChange={(e) =>
                            setProposalKitDraft((d) => ({
                              ...d,
                              brandCustom: e.target.value,
                              pins: { ...d.pins, moduleId: undefined },
                            }))
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3.5 py-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-foreground)]">
                        Origem do kit
                      </p>
                      <p className="mt-0.5 text-xs leading-snug text-[var(--color-muted-foreground)]">
                        Todos os equipamentos vêm de uma única origem — trocar a origem remonta o
                        kit inteiro.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {kitSourceLoading && !kitSourceOptions ? (
                        <span className="inline-flex animate-pulse items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3.5 py-1.5 text-xs text-[var(--color-muted-foreground)]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Comparando origens…
                        </span>
                      ) : null}
                      {ownStockOption ? (
                        <button
                          type="button"
                          disabled={!ownStockOption.available}
                          title={
                            ownStockOption.available
                              ? "Montar o kit 100% do seu estoque"
                              : "Seu estoque não cobre o kit completo para esta configuração"
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${
                            kitDraftSource.kind === "own"
                              ? "border-emerald-500 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300"
                              : ownStockOption.available
                                ? "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] hover:border-emerald-300"
                                : "cursor-not-allowed border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted-foreground)] opacity-70"
                          }`}
                          onClick={() =>
                            setProposalKitDraft((d) => ({
                              ...d,
                              source: { kind: "own" },
                              pins: {},
                            }))
                          }
                        >
                          <Warehouse className="h-3.5 w-3.5" />
                          Meu estoque
                          {ownStockOption.available && ownStockOption.total != null ? (
                            <span className="text-xs font-normal text-[var(--color-muted-foreground)]">
                              {formatCurrency(ownStockOption.total)}
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700 dark:text-amber-300">
                              cobre {ownStockOption.covered_categories ?? 0}/
                              {ownStockOption.required_categories ?? 5}
                            </span>
                          )}
                        </button>
                      ) : null}
                      {supplierOptions.map((s) => (
                        <button
                          key={s.supplier_id}
                          type="button"
                          disabled={!s.available}
                          title={
                            s.available
                              ? s.complete
                                ? `Montar o kit 100% de ${s.supplier_name}`
                                : `${s.supplier_name} cobre só ${s.item_count ?? 0} de 5 itens do kit`
                              : `${s.supplier_name} não tem módulo/inversor compatível`
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${
                            kitDraftSource.kind === "supplier" &&
                            kitDraftSource.id === s.supplier_id
                              ? "border-emerald-500 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300"
                              : s.available
                                ? "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] hover:border-emerald-300"
                                : "cursor-not-allowed border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted-foreground)] opacity-70"
                          }`}
                          onClick={() =>
                            setProposalKitDraft((d) => ({
                              ...d,
                              source: { kind: "supplier", id: s.supplier_id },
                              pins: {},
                            }))
                          }
                        >
                          {s.supplier_name}
                          {s.total != null ? (
                            <span className="text-xs font-normal text-[var(--color-muted-foreground)]">
                              {formatCurrency(s.total)}
                            </span>
                          ) : (
                            <span className="text-xs font-normal text-[var(--color-muted-foreground)]">
                              indisponível
                            </span>
                          )}
                          {s.available && !s.complete ? (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700 dark:text-amber-300">
                              {s.item_count ?? 0}/5 itens
                            </span>
                          ) : null}
                        </button>
                      ))}
                      {!kitSourceLoading && kitSourceOptions && supplierOptions.length === 0 ? (
                        <span className="text-xs text-[var(--color-muted-foreground)]">
                          Nenhum fornecedor cadastrado — kit montado pela melhor oferta do catálogo.
                        </span>
                      ) : null}
                      {!kitSourceLoading && kitSourceOptions === null ? (
                        <span className="text-xs text-[var(--color-muted-foreground)]">
                          Não foi possível comparar as origens — kit montado pela melhor oferta do
                          catálogo.
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {kitDraftSource.kind === "own" &&
                  proposalKitResult &&
                  !proposalKitResult.own_stock_used ? (
                    <p className="rounded-lg border border-amber-500/30 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                      Seu estoque não cobre um kit completo (falta algum item obrigatório ou
                      quantidade). Este kit foi montado com o <strong>catálogo global</strong>.
                    </p>
                  ) : null}
                  {proposalKitError ? (
                    <p className="text-sm text-red-600 dark:text-red-400">{proposalKitError}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--color-foreground)]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/25 to-amber-600/10 text-amber-600 dark:text-amber-400">
                      <Zap className="h-5 w-5" />
                    </span>
                    Equipamentos do kit
                    {proposalKitLoading && proposalKitResult ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-normal text-[var(--color-muted-foreground)]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Atualizando…
                      </span>
                    ) : null}
                  </h3>
                  {proposalKitResult ? (
                    proposalKitResult.own_stock_used ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                        <Warehouse className="h-3 w-3" />
                        Meu estoque
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                        <Sparkles className="h-3 w-3" />
                        {selectedSupplierName ?? "Catálogo global"}
                      </span>
                    )
                  ) : null}
                </div>
                {proposalKitLoading && !proposalKitResult ? (
                  <div className="relative overflow-hidden rounded-2xl border border-violet-500/15 bg-[var(--color-card)] px-4 py-10">
                    <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
                      <div className="absolute -left-1/4 top-0 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl" />
                      <div className="absolute -right-1/4 bottom-0 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl" />
                    </div>
                    <div className="relative flex flex-col items-center gap-3 text-center">
                      <div className="relative">
                        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20 [animation-duration:2s]" />
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 to-violet-500/10">
                          <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <Loader2 className="absolute -bottom-0.5 -right-0.5 h-5 w-5 animate-spin text-violet-600 dark:text-violet-400" />
                      </div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-violet-600/90 dark:text-violet-400/90">
                        Montando o kit
                      </p>
                      <p className="max-w-xs text-sm text-[var(--color-muted-foreground)]">
                        Consultando catálogo e dimensionamento…
                      </p>
                      <div className="h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-[var(--color-muted)]">
                        <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-500 via-violet-500 to-emerald-500 bg-[length:200%_100%] animate-shimmer" />
                      </div>
                    </div>
                  </div>
                ) : null}
                {proposalKitResult ? (
                  <div
                    className={`space-y-5 transition-opacity ${
                      proposalKitLoading ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="inline-flex items-baseline gap-2 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/12 to-emerald-600/5 px-4 py-2.5">
                        <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                          Potência dimensionada
                        </span>
                        <span className="text-xl font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-300">
                          {proposalKitResult.system_power_kw.toLocaleString("pt-BR", {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 2,
                          })}{" "}
                          <span className="text-base font-semibold">kWp</span>
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
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
                              {proposalKitResult.modules.quantity}×
                            </span>{" "}
                            {proposalKitResult.modules.brand_name}{" "}
                            {proposalKitResult.modules.product_name}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 shrink-0 self-center rounded-lg px-3 text-xs"
                          onClick={() =>
                            setKitSwapCategory((c) => (c === "module" ? null : "module"))
                          }
                        >
                          {kitSwapCategory === "module" ? "Fechar" : "Trocar"}
                        </Button>
                      </div>
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
                              {proposalKitResult.inverter.quantity}×
                            </span>{" "}
                            {proposalKitResult.inverter.brand_name}{" "}
                            {proposalKitResult.inverter.product_name}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 shrink-0 self-center rounded-lg px-3 text-xs"
                          onClick={() =>
                            setKitSwapCategory((c) => (c === "inverter" ? null : "inverter"))
                          }
                        >
                          {kitSwapCategory === "inverter" ? "Fechar" : "Trocar"}
                        </Button>
                      </div>
                    </div>
                    {kitSwapCategory ? (
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/10">
                        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3.5 py-2.5">
                          <p className="text-xs font-medium text-[var(--color-foreground)]">
                            {kitSwapCategory === "module"
                              ? "Trocar módulo — alternativas desta origem"
                              : "Trocar inversor — alternativas desta origem"}
                          </p>
                          {(kitSwapCategory === "module" && proposalKitDraft.pins.moduleId) ||
                          (kitSwapCategory === "inverter" && proposalKitDraft.pins.inverterId) ? (
                            <button
                              type="button"
                              className="text-xs text-emerald-700 hover:underline dark:text-emerald-300"
                              onClick={() => {
                                const cat = kitSwapCategory;
                                setKitSwapCategory(null);
                                setProposalKitDraft((d) => ({
                                  ...d,
                                  pins: {
                                    ...d.pins,
                                    ...(cat === "module"
                                      ? { moduleId: undefined }
                                      : { inverterId: undefined }),
                                  },
                                }));
                              }}
                            >
                              Voltar à seleção automática
                            </button>
                          ) : null}
                        </div>
                        {kitAlternativesLoading ? (
                          <p className="flex items-center gap-2 px-3.5 py-3 text-xs text-[var(--color-muted-foreground)]">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Simulando alternativas compatíveis…
                          </p>
                        ) : null}
                        {kitAlternativesError ? (
                          <p className="px-3.5 py-3 text-xs text-red-600 dark:text-red-400">
                            {kitAlternativesError}
                          </p>
                        ) : null}
                        {kitAlternatives?.map((alt) => {
                          const currentId =
                            kitSwapCategory === "module"
                              ? proposalKitResult.modules.product_id
                              : proposalKitResult.inverter.product_id;
                          const isCurrent = alt.product_id === currentId;
                          const currentTotal = kitItemsTotal(proposalKitResult.kit_items);
                          const delta = alt.kit_total != null ? alt.kit_total - currentTotal : null;
                          return (
                            <button
                              key={alt.product_id}
                              type="button"
                              disabled={!alt.compatible || isCurrent}
                              className={`flex w-full items-center gap-2.5 border-b border-[var(--color-border)]/60 px-3.5 py-2.5 text-left last:border-0 ${
                                isCurrent
                                  ? "bg-emerald-500/[0.06]"
                                  : alt.compatible
                                    ? "transition-colors hover:bg-emerald-500/[0.04]"
                                    : "opacity-60"
                              }`}
                              onClick={() => {
                                if (!alt.compatible || isCurrent) return;
                                const cat = kitSwapCategory;
                                setKitSwapCategory(null);
                                setProposalKitDraft((d) => ({
                                  ...d,
                                  pins: {
                                    ...d.pins,
                                    ...(cat === "module"
                                      ? { moduleId: alt.product_id }
                                      : { inverterId: alt.product_id }),
                                  },
                                }));
                              }}
                            >
                              {isCurrent ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <span
                                  className={`h-4 w-4 shrink-0 rounded-full border ${
                                    alt.compatible
                                      ? "border-[var(--color-border)]"
                                      : "border-dashed border-[var(--color-border)]"
                                  }`}
                                  aria-hidden
                                />
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-[var(--color-foreground)]">
                                  {alt.brand_name} {alt.product_name}
                                  {isCurrent ? (
                                    <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700 dark:text-emerald-300">
                                      atual
                                    </span>
                                  ) : null}
                                </span>
                                <span className="block text-xs text-[var(--color-muted-foreground)]">
                                  {alt.compatible
                                    ? `${alt.quantity}× ${formatCurrency(alt.unit_price)}${
                                        alt.string_summary ? ` · ${alt.string_summary}` : ""
                                      }`
                                    : alt.reason}
                                </span>
                              </span>
                              {alt.compatible && delta != null && !isCurrent ? (
                                <span
                                  className={`shrink-0 text-xs font-semibold tabular-nums ${
                                    delta < 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : delta > 0
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-[var(--color-muted-foreground)]"
                                  }`}
                                >
                                  {delta === 0
                                    ? "mesmo total"
                                    : `${delta > 0 ? "+" : "−"} ${formatCurrency(Math.abs(delta))}`}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                        {kitAlternatives && kitAlternatives.length === 0 ? (
                          <p className="px-3.5 py-3 text-xs text-[var(--color-muted-foreground)]">
                            Nenhuma alternativa nesta origem.
                          </p>
                        ) : null}
                        {kitCrossAlternatives && kitCrossAlternatives.length > 0 ? (
                          <>
                            <div className="border-t border-amber-500/30 bg-amber-500/[0.06] px-3.5 py-2">
                              <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                                Em outras origens — escolher remonta o kit inteiro
                              </p>
                              <p className="text-[0.7rem] leading-snug text-amber-700/90 dark:text-amber-300/80">
                                O kit é sempre de origem única: ao escolher um item abaixo, módulos,
                                inversor, estrutura, cabo e conectores são remontados na origem
                                nova.
                              </p>
                            </div>
                            {kitCrossAlternatives.map((alt) => {
                              const currentTotal = kitItemsTotal(proposalKitResult.kit_items);
                              const delta =
                                alt.kit_total != null ? alt.kit_total - currentTotal : null;
                              const sourceLabel =
                                alt.source_type === "own_stock"
                                  ? "Meu estoque"
                                  : (alt.supplier_name ?? "Fornecedor");
                              return (
                                <button
                                  key={`${alt.source_type}-${alt.supplier_id ?? "own"}-${alt.product_id}`}
                                  type="button"
                                  className="flex w-full items-center gap-2.5 border-b border-[var(--color-border)]/60 px-3.5 py-2.5 text-left transition-colors last:border-0 hover:bg-amber-500/[0.05]"
                                  title={`Remontar o kit inteiro a partir de ${sourceLabel} com este item fixado`}
                                  onClick={() => {
                                    const cat = kitSwapCategory;
                                    if (!cat) return;
                                    if (alt.source_type === "supplier" && !alt.supplier_id) return;
                                    setKitSwapCategory(null);
                                    autoSourceAppliedRef.current = true;
                                    setProposalKitDraft((d) => ({
                                      ...d,
                                      source:
                                        alt.source_type === "own_stock"
                                          ? { kind: "own" }
                                          : { kind: "supplier", id: alt.supplier_id! },
                                      pins:
                                        cat === "module"
                                          ? { moduleId: alt.product_id }
                                          : { inverterId: alt.product_id },
                                    }));
                                  }}
                                >
                                  <span
                                    className="h-4 w-4 shrink-0 rounded-full border border-amber-500/50"
                                    aria-hidden
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm text-[var(--color-foreground)]">
                                      {alt.brand_name} {alt.product_name}
                                      <span
                                        className={`ml-2 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                                          alt.source_type === "own_stock"
                                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                            : "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                                        }`}
                                      >
                                        {sourceLabel}
                                      </span>
                                    </span>
                                    <span className="block text-xs text-[var(--color-muted-foreground)]">
                                      {alt.quantity}× {formatCurrency(alt.unit_price)}
                                      {alt.string_summary ? ` · ${alt.string_summary}` : ""}
                                      {alt.kit_total != null
                                        ? ` · kit completo: ${formatCurrency(alt.kit_total)}`
                                        : ""}
                                    </span>
                                  </span>
                                  {delta != null ? (
                                    <span
                                      className={`shrink-0 text-xs font-semibold tabular-nums ${
                                        delta < 0
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : delta > 0
                                            ? "text-red-600 dark:text-red-400"
                                            : "text-[var(--color-muted-foreground)]"
                                      }`}
                                    >
                                      {delta === 0
                                        ? "mesmo total"
                                        : `${delta > 0 ? "+" : "−"} ${formatCurrency(Math.abs(delta))}`}
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    {proposalKitResult.string_configuration ? (
                      <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                        <span className="font-medium text-[var(--color-foreground)]">Strings:</span>{" "}
                        {proposalKitResult.string_configuration.string_count} strings de{" "}
                        {proposalKitResult.string_configuration.modules_per_string} módulos
                      </p>
                    ) : null}
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
                          {proposalKitResult.kit_items.map((item, idx) => {
                            const isModuleRow =
                              item.product_id === proposalKitResult.modules.product_id;
                            const isInverterRow =
                              item.product_id === proposalKitResult.inverter.product_id;
                            const qty = effectiveKitQty(item);
                            const hasDraft = kitQtyDrafts[item.product_id] != null;
                            const isAdjusted = hasDraft && qty !== item.quantity;
                            const belowCalculated = isAdjusted && qty < item.quantity;
                            return (
                              <tr
                                key={item.product_id}
                                className={`border-b border-[var(--color-border)]/80 transition-colors last:border-0 hover:bg-emerald-500/[0.04] ${
                                  idx % 2 === 1 ? "bg-[var(--color-muted)]/15" : ""
                                }`}
                              >
                                <td className="p-3 font-medium text-[var(--color-foreground)]">
                                  {item.product_name}
                                  {isAdjusted ? (
                                    <span className="mt-0.5 block text-[0.7rem] font-normal text-[var(--color-muted-foreground)]">
                                      calculado: {item.quantity}
                                      {" · "}
                                      <button
                                        type="button"
                                        className="text-emerald-700 hover:underline dark:text-emerald-300"
                                        onClick={() =>
                                          setKitQtyDrafts((prev) => {
                                            const next = { ...prev };
                                            delete next[item.product_id];
                                            return next;
                                          })
                                        }
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
                                  {item.brand_name}
                                </td>
                                <td className="p-3 text-right tabular-nums text-[var(--color-foreground)]">
                                  {isModuleRow ? (
                                    <span className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        aria-label="Um módulo a menos"
                                        className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] text-sm leading-none hover:border-emerald-400"
                                        onClick={() => adjustModuleQuantity(-1)}
                                      >
                                        −
                                      </button>
                                      <span className="min-w-[2ch] text-center">
                                        {item.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        aria-label="Um módulo a mais"
                                        className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] text-sm leading-none hover:border-emerald-400"
                                        onClick={() => adjustModuleQuantity(1)}
                                      >
                                        +
                                      </button>
                                    </span>
                                  ) : isInverterRow ? (
                                    <span
                                      title="Quantidade definida pelo dimensionamento (strings/microinversores)"
                                      className="cursor-help underline decoration-dotted underline-offset-2"
                                    >
                                      {item.quantity}
                                    </span>
                                  ) : (
                                    <input
                                      type="number"
                                      min={1}
                                      inputMode="numeric"
                                      aria-label={`Quantidade de ${item.product_name}`}
                                      className={`h-7 w-16 rounded-md border bg-[var(--color-background)] px-1.5 text-right tabular-nums outline-none focus:border-emerald-400 ${
                                        belowCalculated
                                          ? "border-amber-500/60"
                                          : "border-[var(--color-border)]"
                                      }`}
                                      value={kitQtyDrafts[item.product_id] ?? String(item.quantity)}
                                      onChange={(e) => {
                                        setKitQtyResetNotice(false);
                                        const raw = e.target.value;
                                        setKitQtyDrafts((prev) =>
                                          raw === String(item.quantity)
                                            ? (() => {
                                                const next = { ...prev };
                                                delete next[item.product_id];
                                                return next;
                                              })()
                                            : { ...prev, [item.product_id]: raw }
                                        );
                                      }}
                                    />
                                  )}
                                </td>
                                <td className="hidden p-3 text-right tabular-nums text-[var(--color-muted-foreground)] sm:table-cell">
                                  {item.unit_price.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}
                                </td>
                                <td className="p-3 text-right font-medium tabular-nums text-[var(--color-foreground)]">
                                  {(qty * item.unit_price).toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}
                                </td>
                              </tr>
                            );
                          })}
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
                              {formatCurrency(kitItemsTotal(effectiveKitItems))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {kitQtyResetNotice ? (
                      <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                        O kit foi recalculado e os ajustes manuais de quantidade foram redefinidos
                        para os valores dimensionados.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          <DialogFooter className="flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button
                variant="outline"
                className="w-full bg-[var(--color-background)] sm:w-auto"
                onClick={(e) => setShareMenuAnchor(e.currentTarget)}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar
                <ChevronDown className="ml-1.5 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              </Button>
              <Menu
                anchorEl={shareMenuAnchor}
                open={Boolean(shareMenuAnchor)}
                onClose={() => setShareMenuAnchor(null)}
                sx={{ zIndex: 1400 }}
              >
                <MenuItem
                  disabled={!proposalDeal?.whatsapp}
                  onClick={() => {
                    if (!proposalDeal?.whatsapp) return;
                    const message =
                      proposalKitWhatsapp ??
                      `Olá ${proposalDeal.clientName}, segue uma simulação solar que preparamos para você.`;
                    window.open(waMeUrl(proposalDeal.whatsapp, message), "_blank", "noreferrer");
                    setShareMenuAnchor(null);
                  }}
                >
                  <MessageCircle className="mr-2.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Enviar kit no WhatsApp
                </MenuItem>
                <MenuItem
                  disabled={!proposalKitWhatsapp}
                  onClick={() => {
                    if (!proposalKitWhatsapp) return;
                    void navigator.clipboard.writeText(proposalKitWhatsapp);
                    setProposalKitCopied(true);
                    window.setTimeout(() => setProposalKitCopied(false), 2000);
                  }}
                >
                  {proposalKitCopied ? (
                    <>
                      <CheckCircle2 className="mr-2.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Mensagem copiada
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2.5 h-4 w-4 text-[var(--color-muted-foreground)]" />
                      Copiar texto do kit
                    </>
                  )}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    const link = proposalDeal
                      ? `${window.location.origin}/clientes/${proposalDeal.leadId}`
                      : window.location.href;
                    void navigator.clipboard.writeText(link);
                    setProposalLinkCopied(true);
                    window.setTimeout(() => setProposalLinkCopied(false), 2000);
                  }}
                >
                  {proposalLinkCopied ? (
                    <>
                      <CheckCircle2 className="mr-2.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Link copiado
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2.5 h-4 w-4 text-[var(--color-muted-foreground)]" />
                      Copiar link do cliente
                    </>
                  )}
                </MenuItem>
              </Menu>
              <Link
                href={proposalDeal ? `/clientes/${proposalDeal.leadId}` : "/propostas"}
                className="w-full sm:w-auto"
              >
                <Button
                  variant="ghost"
                  className="w-full text-[var(--color-muted-foreground)] sm:w-auto"
                >
                  Abrir cliente
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            {proposalDeal ? (
              <div className="w-full sm:w-auto">
                <Button
                  type="button"
                  className="h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 text-base font-semibold text-white shadow-sm hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-60 sm:w-auto"
                  disabled={
                    proposalCreateLoading || proposalKitLoading || !generatedProposal?.dealId
                  }
                  title="Ao concluir, você vai para a ficha do cliente com a proposta em destaque."
                  onClick={() => void createProposalFromPipelineModal()}
                >
                  {proposalCreateLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                      Criando proposta…
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4 shrink-0" />
                      Criar proposta
                      {generatedProposal
                        ? ` · ${formatCurrency(generatedProposal.valorSistema)}`
                        : ""}
                    </>
                  )}
                </Button>
                {proposalCreateError ? (
                  <p className="mt-2 text-sm text-red-600 sm:text-right dark:text-red-400">
                    {proposalCreateError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
ProposalEconomicsModal.displayName = "ProposalEconomicsModal";
