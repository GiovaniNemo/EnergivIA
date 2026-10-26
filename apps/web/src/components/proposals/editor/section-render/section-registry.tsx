import type { CSSProperties, JSX } from "react";
import {
  AlertCircle,
  Battery,
  BadgeAlert,
  Compass,
  DollarSign,
  LineChart,
  Plug,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import {
  DEMO_PROPOSAL_EQUIPMENT_ITEMS,
  equipmentCategoryLucideIcon,
  resolveProposalEquipmentItemsForPreview,
  type ProposalEquipmentItem,
  type ProposalEquipmentProductSnapshot,
} from "../proposal-equipment-model";
import type { ProposalSection } from "../types";
import { safeHtml } from "@energivia/utils";
import { SystemPerformanceSection } from "@/components/proposals/sections/system-performance/SystemPerformanceSection";
import { parseGenerationConsumptionFields } from "@/components/proposals/sections/system-performance/parse-generation-fields";
import { TestimonialsSectionPreview } from "@/components/proposals/sections/testimonials/testimonials-preview";
import { StepsSection } from "@/components/proposals/sections/steps/steps-section";
import { brandingToStepsTheme } from "@/components/proposals/sections/steps/steps-theme";
import {
  demoProcessSteps,
  normalizeProcessSteps,
} from "@/components/proposals/sections/steps/normalize-steps";
import { DecisionCTASection } from "@/components/proposals/sections/cta/decision-cta-section";
import { EconomyPurchasesSection } from "@/components/proposals/sections/economy-purchases/EconomyPurchasesSection";
import { PricingSectionPreview } from "@/components/proposals/sections/pricing/pricing-section-preview";
import { ProposalPaymentCards } from "@/components/proposals/sections/pricing/proposal-payment-cards";
import { normalizePaymentOptions } from "@/lib/proposal-payment-utils";
import { SignatureSectionPreview } from "@/components/proposals/sections/signature/signature-section-preview";

import { buildDecisionCTATheme } from "@/components/proposals/sections/cta/cta-theme";
import {
  resolveCtaActions,
  resolveProposalBaseUrl,
} from "@/components/proposals/sections/cta/cta-fields";
import type { SectionRenderOptions, PreviewRenderVariables } from "./types";

function replaceVariablesServerSafe(html: string, values: Record<string, string | number>): string {
  return html.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const resolved = values[key.trim()];
    return resolved === undefined || resolved === null ? "" : String(resolved);
  });
}

function parseMoneyLikeServerSafe(value: unknown, fallback: number = Number.NaN): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return fallback;
  const cleaned = raw.replace(/[^\d,.\-]/g, "");
  if (!cleaned) return fallback;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : fallback;
  }
  if (cleaned.includes(",")) {
    const normalized = cleaned.replace(",", ".");
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : fallback;
  }
  if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    const normalized = cleaned.replace(/\./g, "");
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : fallback;
  }
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function resolveSectionVariantServerSafe(sectionType: string, variant: unknown): string {
  const raw = typeof variant === "string" ? variant : "";
  const normalized = raw.trim().toLowerCase();
  if (sectionType === "diagnostic_energy") {
    if (normalized === "cards" || normalized === "list" || normalized === "topics")
      return normalized;
    return "topics";
  }
  if (sectionType === "solution") {
    if (normalized === "cards" || normalized === "list" || normalized === "topics")
      return normalized;
    return "topics";
  }
  if (sectionType === "generation_consumption") {
    if (normalized === "dashboard" || normalized === "modern") return normalized;
    return "dashboard";
  }
  if (sectionType === "proposal_equipment") {
    if (normalized === "cards" || normalized === "table" || normalized === "compact")
      return normalized;
    return "cards";
  }
  if (sectionType === "process_steps") {
    if (normalized === "vertical" || normalized === "timeline" || normalized === "cards")
      return normalized;
    return "vertical";
  }
  if (sectionType === "cta") {
    if (normalized === "primary" || normalized === "secondary" || normalized === "minimal")
      return normalized;
    return "primary";
  }
  if (sectionType === "pricing") {
    if (normalized === "compact") return "compact";
    return "table";
  }
  if (sectionType === "gallery") {
    if (
      normalized === "grid_uniform" ||
      normalized === "masonry" ||
      normalized === "mosaic_hero" ||
      normalized === "editorial" ||
      normalized === "overlay"
    )
      return normalized;
    if (normalized === "grid" || normalized === "default") return "grid_uniform";
    if (normalized === "slider" || normalized === "carousel") return "masonry";
    if (normalized === "before_after") return "overlay";
    return "grid_uniform";
  }
  return normalized || "default";
}

interface SectionFields {
  text?: string;
  image?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  overlayColor?: string;
  overlayOpacity?: number | string;
  highlight?: boolean;
  items?: unknown;
  paymentConditions?: string;
  layout?: string;
  images?: unknown;
  headline?: string;
  showDiscountRow?: boolean;
  helperText?: string;
  style?: string;
  buttonText?: string;
  buttonAction?: string;
  signatureName?: string;
  beforeLabel?: string;
  afterLabel?: string;
  videoUrl?: string;
  title?: string;
  monthlyBill?: number | string;
  eyebrow?: string;
  subtitle?: string;
  description?: string;
  quote?: string;
  signature?: string;
  stats?: unknown;
  features?: unknown;
  badge_value?: string;
  badge_label?: string;
  tag_top?: string;
  meta_value?: string;
  meta_label?: string;
  annualCost?: number | string;
  projected5yCost?: number | string;
  projected10yCost?: number | string;
  increaseRate?: number | string;
  painPoints?: unknown;
  impact?: unknown;
  highlightText?: string;
  highlightIcon?: string;
  painIconColor?: string;
  impactIconColor?: string;
  highlightIconColor?: string;
  solutionName?: string;
  benefits?: unknown;
  howItWorks?: string;
  greeting?: string;
  countLabel?: string;
}

const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  "alert-circle": AlertCircle,
  battery: Battery,
  "badge-alert": BadgeAlert,
  "dollar-sign": DollarSign,
  "line-chart": LineChart,
  plug: Plug,
  shield: Shield,
  "shield-alert": ShieldAlert,
  "trending-up": TrendingUp,
  wallet: Wallet,
  zap: Zap,
};

function toPascalCase(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join("");
}

function resolveLucideIcon(iconName: string | undefined): LucideIcon {
  const normalized = String(iconName ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return AlertCircle;
  const staticMatch = LUCIDE_ICON_MAP[normalized];
  if (staticMatch) return staticMatch;
  if (!(normalized in dynamicIconImports)) return AlertCircle;
  const exportName = toPascalCase(normalized);
  const candidate = (LucideIcons as Record<string, unknown>)[exportName];
  const isRenderable =
    typeof candidate === "function" || (typeof candidate === "object" && candidate);
  return isRenderable ? (candidate as LucideIcon) : AlertCircle;
}

function asIconTextItems(value: unknown): Array<{ text: string; icon: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as { text?: unknown; icon?: unknown };
      const text = String(raw.text ?? "").trim();
      if (!text) return null;
      return {
        text,
        icon: String(raw.icon ?? "alert-circle")
          .trim()
          .toLowerCase(),
      };
    })
    .filter((item): item is { text: string; icon: string } => item !== null);
}

function toCurrency(value: unknown): string {
  const numeric = parseMoneyLikeServerSafe(value, 0);
  if (!Number.isFinite(numeric)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numeric);
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  return [];
}

function asObjectArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}

function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  if (url.includes("youtube.com/watch?v=")) {
    const id = url.split("v=")[1]?.split("&")[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1]?.split("?")[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (url.includes("vimeo.com/")) {
    const id = url.split("vimeo.com/")[1]?.split("?")[0];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

function tpl(value: unknown, vars: PreviewRenderVariables): string {
  return replaceVariablesServerSafe(String(value ?? ""), vars as unknown as Record<string, string>);
}

function renderRichText(value: unknown, vars: PreviewRenderVariables): JSX.Element | null {
  const html = tpl(value, vars).trim();
  if (!html) return null;
  return (
    <div className="preview-rich-content max-w-none" dangerouslySetInnerHTML={safeHtml(html)} />
  );
}

function resolveDisplayAssetUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const raw = value.trim();
  try {
    const parsed = new URL(raw);
    const isPresignedPutUrl =
      parsed.searchParams.has("X-Amz-Algorithm") && parsed.searchParams.get("x-id") === "PutObject";
    if (!isPresignedPutUrl) return raw;
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return raw;
  }
}

function resolveIconColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized || fallback;
}

function resolveSectionHorizontalAlignment(section: ProposalSection): "left" | "center" | "right" {
  const alignment = String((section.fields as Record<string, unknown>)["alignment"] ?? "left");
  switch (alignment) {
    case "center":
    case "top-center":
    case "middle-center":
    case "bottom-center":
      return "center";
    case "right":
    case "top-right":
    case "middle-right":
    case "bottom-right":
      return "right";
    default:
      return "left";
  }
}

function benefitRowsCrossAxisClass(align: "left" | "center" | "right"): string {
  if (align === "center") return "items-center";
  if (align === "right") return "items-end";
  return "items-start";
}

function benefitGridJustifyItemsClass(align: "left" | "center" | "right"): string {
  if (align === "center") return "justify-items-center";
  if (align === "right") return "justify-items-end";
  return "justify-items-start";
}

function filterVisibleProposalEquipmentItems(
  items: ProposalEquipmentItem[]
): ProposalEquipmentItem[] {
  return items.filter(
    (it) =>
      it.title.trim() ||
      it.subtitle.trim() ||
      it.imageUrl.trim() ||
      it.specs.some((s) => s.label.trim() || s.value.trim())
  );
}

const equipmentChromeBorder = {
  borderColor: "color-mix(in srgb, currentColor 14%, #e2e8f0)",
} as const;

const equipmentChromeSurface = {
  backgroundColor: "#f8fafc",
} as const;

const equipmentIconDisc = {
  backgroundColor: "color-mix(in srgb, var(--preview-primary-color, currentColor) 14%, #ffffff)",
} as const;

const equipmentIconColor = {
  color: "var(--preview-primary-color, currentColor)",
} as const;

function renderProposalEquipmentCards(items: ProposalEquipmentItem[]): JSX.Element {
  return (
    <div className="proposal-equipments-grid grid gap-3">
      {items.map((item) => {
        const img = resolveDisplayAssetUrl(item.imageUrl);
        return (
          <div
            key={item.id}
            className="proposal-equipment-card flex h-full flex-wrap gap-3 rounded-xl border p-3 shadow-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            style={{
              backgroundColor: "#ffffff",
            }}
          >
            <div
              className="proposal-equipment-media flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg"
              style={equipmentChromeSurface}
            >
              {img ? (
                <img
                  src={img}
                  alt=""
                  className="proposal-equipment-image max-h-24 w-full object-contain"
                />
              ) : (
                <span className="px-2 text-center text-[0.65rem] leading-tight opacity-60">
                  Sem imagem
                </span>
              )}
            </div>
            <div className="proposal-equipment-header min-w-0 flex-1 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.title ? (
                  <p className="text-sm font-semibold leading-snug">{item.title}</p>
                ) : null}
                {(() => {
                  const cat = (item.categoryName || "").toLowerCase();
                  const title = (item.title || "").toLowerCase();
                  const isHybridOrStorage =
                    cat.includes("battery") ||
                    cat.includes("bater") ||
                    cat.includes("bms") ||
                    cat.includes("hybrid") ||
                    cat.includes("off_grid") ||
                    cat.includes("off-grid") ||
                    title.includes("bateria") ||
                    title.includes("híbrido") ||
                    title.includes("hibrido");
                  if (isHybridOrStorage) {
                    return (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300">
                        ⚡ Exclusivo Híbrido / Off-Grid
                      </span>
                    );
                  }
                  return null;
                })()}
                {item.isTier1 ? (
                  <img
                    src="/badges/tier1.png"
                    alt="Tier 1"
                    title="Módulo certificado Tier 1 (BloombergNEF)"
                    className="h-5 w-auto object-contain rounded shadow-xs shrink-0"
                  />
                ) : null}
              </div>
              {item.subtitle ? <p className="mt-0.5 text-xs opacity-85">{item.subtitle}</p> : null}
              {item.datasheetUrl ? (
                <a
                  href={item.datasheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  📄 Baixar Datasheet
                </a>
              ) : null}
            </div>
            <div className="min-w-0 basis-full">
              <div className="my-2 border-t" style={equipmentChromeBorder} />
              <div className="grid grid-cols-2 gap-3">
                {item.specs.map((spec, idx) => {
                  if (!spec.label.trim() && !spec.value.trim()) {
                    return <div key={`${item.id}-sp-${idx}`} />;
                  }
                  const SpecIcon = resolveLucideIcon(spec.icon);
                  return (
                    <div key={`${item.id}-sp-${idx}`} className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                          style={equipmentIconDisc}
                        >
                          <SpecIcon
                            className="h-3.5 w-3.5"
                            style={equipmentIconColor}
                            aria-hidden
                          />
                        </span>
                        <span className="text-[0.65rem] font-medium uppercase tracking-wide opacity-80">
                          {spec.label || "—"}
                        </span>
                      </div>
                      <p className="mt-1 pl-8 text-xs font-semibold">{spec.value || "—"}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderProposalEquipmentTable(items: ProposalEquipmentItem[]): JSX.Element {
  return (
    <div className="overflow-x-auto rounded-lg border" style={equipmentChromeBorder}>
      <table className="w-full min-w-[480px] border-collapse text-left text-[0.85em]">
        <thead>
          <tr className="border-b opacity-80" style={equipmentChromeBorder}>
            <th className="w-24 px-2 py-2 font-medium">Foto</th>
            <th className="px-2 py-2 font-medium">Equipamento</th>
            <th className="px-2 py-2 font-medium">Especificações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const img = resolveDisplayAssetUrl(item.imageUrl);
            const specLines = item.specs.filter((s) => s.label.trim() || s.value.trim());
            return (
              <tr key={item.id} className="border-t align-top" style={equipmentChromeBorder}>
                <td className="px-2 py-2">
                  <div
                    className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md"
                    style={equipmentChromeSurface}
                  >
                    {img ? (
                      <img src={img} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="px-1 text-center text-[0.55rem] opacity-55">—</span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="font-semibold">{item.title || "—"}</div>
                    {item.isTier1 ? (
                      <img
                        src="/badges/tier1.png"
                        alt="Tier 1"
                        title="Módulo certificado Tier 1 (BloombergNEF)"
                        className="h-4.5 w-auto object-contain rounded shadow-xs shrink-0"
                      />
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs opacity-75">{item.subtitle}</div>
                  {item.productId.trim() ? (
                    <div className="mt-1 font-mono text-[0.6rem] opacity-60">#{item.productId}</div>
                  ) : null}
                </td>
                <td className="px-2 py-2">
                  <ul className="list-none space-y-1">
                    {specLines.map((s, i) => (
                      <li key={`${item.id}-tl-${i}`}>
                        <span className="opacity-[0.65]">{s.label}:</span>{" "}
                        <span className="font-medium">{s.value}</span>
                      </li>
                    ))}
                  </ul>
                  {item.datasheetUrl ? (
                    <a
                      href={item.datasheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                    >
                      📄 Baixar Datasheet
                    </a>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function renderProposalEquipmentList(items: ProposalEquipmentItem[]): JSX.Element {
  return (
    <ul className="m-0 list-none space-y-4 p-0">
      {items.map((item) => {
        const specLines = item.specs.filter((s) => s.label.trim() || s.value.trim());
        const img = resolveDisplayAssetUrl(item.imageUrl);
        const typeIconName = equipmentCategoryLucideIcon(item.categoryName);
        const TypeIcon = resolveLucideIcon(typeIconName);
        return (
          <li
            key={item.id}
            className="border-b pb-4 last:border-b-0 last:pb-0"
            style={equipmentChromeBorder}
          >
            <div className="flex gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={equipmentIconDisc}
                title={item.categoryName ?? undefined}
              >
                <TypeIcon className="h-5 w-5 shrink-0" style={equipmentIconColor} aria-hidden />
              </div>
              {img ? (
                <img
                  src={img}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-md border object-contain"
                  style={equipmentChromeBorder}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold">{item.title || "Equipamento"}</p>
                  {item.isTier1 ? (
                    <img
                      src="/badges/tier1.png"
                      alt="Tier 1"
                      title="Módulo certificado Tier 1 (BloombergNEF)"
                      className="h-4.5 w-auto object-contain rounded shadow-xs shrink-0"
                    />
                  ) : null}
                </div>
                {item.subtitle ? <p className="text-xs opacity-75">{item.subtitle}</p> : null}
                <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs">
                  {specLines.map((s, i) => (
                    <li key={`${item.id}-li-${i}`}>
                      <span className="opacity-[0.65]">{s.label}:</span> {s.value}
                    </li>
                  ))}
                </ul>
                {item.datasheetUrl ? (
                  <a
                    href={item.datasheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    📄 Baixar Datasheet
                  </a>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function trimSectionColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t || undefined;
}

function brandingForPricingSection(
  branding: SectionRenderOptions["branding"] | undefined,
  fields: Record<string, unknown>
): SectionRenderOptions["branding"] | null {
  if (!branding) return null;
  const textColor = trimSectionColor(fields["textColor"]);
  const backgroundColor = trimSectionColor(fields["backgroundColor"]);
  if (!textColor && !backgroundColor) return branding;
  return {
    ...branding,
    ...(textColor ? { textColor } : {}),
    ...(backgroundColor ? { backgroundColor } : {}),
  };
}

export function renderSectionContent(
  section: ProposalSection,
  vars: PreviewRenderVariables,
  options?: SectionRenderOptions
): JSX.Element {
  const renderMode = options?.mode ?? "web";
  const f = section.fields as SectionFields;

  switch (section.type) {
    case "introduction": {
      const variant = String(section.variant ?? "carta");
      const greeting = tpl(f.greeting || "Prezado(a)", vars);
      const clientName = tpl("{{nome_cliente}}", vars);

      if (variant === "carta") {
        const isPdf = renderMode === "pdf";
        return (
          <div
            className={`rounded-xl ${isPdf ? "px-2 py-3" : "px-5 py-8 sm:px-10 sm:py-10 md:px-16 md:py-14"}`}
            style={{ position: "relative" }}
          >
            <div
              className="mb-4 sm:mb-6 h-px w-12"
              style={{ background: "var(--preview-primary-color, #10b981)" }}
            />
            <div className="mb-2 text-[14px] sm:text-[15px] italic opacity-80">{greeting}</div>
            <div className="mb-4 sm:mb-8 text-3xl sm:text-4xl md:text-[38px] font-bold leading-none tracking-[-0.035em]">
              {clientName},
            </div>
            <div
              data-editor-field-path="title"
              className="preview-editable-target mb-3 sm:mb-4 text-lg sm:text-xl md:text-[22px] font-normal leading-[1.35] tracking-[-0.015em]"
              style={{ maxWidth: 580 }}
            >
              {renderRichText(f.title, vars)}
            </div>
            <div
              data-editor-field-path="text"
              className="preview-editable-target text-sm sm:text-[15px] leading-[1.75] opacity-90"
              style={{ maxWidth: 540 }}
            >
              {renderRichText(f.text, vars)}
            </div>
            <div
              className="mt-6 sm:mt-8 pt-4 sm:pt-5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[.18em]"
              style={{
                borderTop: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
                opacity: 0.7,
              }}
            >
              Proposta personalizada
            </div>
          </div>
        );
      }

      if (variant === "hero") {
        return (
          <div className="relative overflow-hidden rounded-xl px-5 py-8 sm:px-10 sm:py-10 md:px-14 md:py-14">
            <div
              className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full"
              style={{
                background: `radial-gradient(circle, var(--preview-primary-color, #10b981) 0%, transparent 60%)`,
                opacity: 0.1,
                filter: "blur(40px)",
                transform: "translate(30%, -30%)",
              }}
            />
            <div
              className="relative z-10 mb-4 sm:mb-6 inline-flex items-center gap-2.5 sm:gap-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[.2em]"
              style={{ color: "var(--preview-primary-color, #10b981)" }}
            >
              <span
                className="h-px w-6 inline-block"
                style={{ background: "var(--preview-primary-color, #10b981)" }}
              />
              Sua proposta
            </div>
            <div
              className="relative z-10 mb-3 sm:mb-4 text-base sm:text-[18px] font-light"
              style={{ opacity: 0.75 }}
            >
              {greeting}{" "}
              <strong className="font-semibold" style={{ opacity: 1 }}>
                {clientName}
              </strong>
              ,
            </div>
            <div
              data-editor-field-path="title"
              className="preview-editable-target relative z-10 mb-4 sm:mb-6 text-2xl sm:text-3xl md:text-[44px] font-medium leading-[1.08] tracking-[-0.03em]"
              style={{ maxWidth: 800 }}
            >
              <style>{`[data-editor-field-path="title"] em { color: var(--preview-primary-color, #10b981); font-style: italic; }`}</style>
              {renderRichText(f.title, vars)}
            </div>
            <div
              data-editor-field-path="text"
              className="preview-editable-target relative z-10 text-sm sm:text-[15px] leading-[1.7]"
              style={{ maxWidth: 600, opacity: 0.75 }}
            >
              {renderRichText(f.text, vars)}
            </div>
          </div>
        );
      }

      if (variant === "split-name") {
        return (
          <div
            className="introduction-split-name-grid py-4 sm:py-6"
            style={{ position: "relative" }}
          >
            <div
              className="pointer-events-none absolute hidden md:block"
              style={{
                left: "50%",
                top: 32,
                bottom: 32,
                width: 1,
                background:
                  "linear-gradient(180deg, transparent, rgba(128,128,128,0.2) 20%, rgba(128,128,128,0.2) 80%, transparent)",
                transform: "translateX(-24px)",
              }}
            />
            <div className="pt-2">
              <div
                className="mb-3 sm:mb-5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[.22em]"
                style={{ color: "var(--preview-primary-color, #10b981)" }}
              >
                Para
              </div>
              <div
                className="mb-1.5 sm:mb-2 text-base sm:text-[18px] font-light italic"
                style={{ opacity: 0.6 }}
              >
                {greeting},
              </div>
              <div
                className="inline-block pb-3 text-3xl sm:text-4xl md:text-[46px] font-bold leading-none tracking-[-0.035em]"
                style={{
                  borderBottom: "2px solid var(--preview-primary-color, #10b981)",
                  maxWidth: "100%",
                  wordBreak: "break-word",
                }}
              >
                {clientName}
              </div>
            </div>
            <div className="pt-2">
              <div
                data-editor-field-path="title"
                className="preview-editable-target mb-4 sm:mb-5 pb-4 sm:pb-5 text-lg sm:text-[20px] font-medium leading-[1.3] tracking-[-0.015em]"
                style={{ borderBottom: "1px solid rgba(128,128,128,0.15)" }}
              >
                {renderRichText(f.title, vars)}
              </div>
              <div
                data-editor-field-path="text"
                className="preview-editable-target text-sm sm:text-[14px] leading-[1.75]"
                style={{ opacity: 0.65 }}
              >
                {renderRichText(f.text, vars)}
              </div>
            </div>
          </div>
        );
      }

      if (variant === "centered") {
        return (
          <div className="rounded-xl px-5 py-8 sm:px-8 sm:py-12 md:px-12 md:py-16 text-center">
            <div
              className="mx-auto mb-5 sm:mb-6 h-px w-14"
              style={{ background: "var(--preview-primary-color, #10b981)" }}
            />
            <div
              className="mb-5 sm:mb-7 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[.22em]"
              style={{ opacity: 0.75 }}
            >
              {greeting}{" "}
              <strong className="font-bold" style={{ opacity: 1 }}>
                {clientName}
              </strong>
            </div>
            <div
              data-editor-field-path="title"
              className="preview-editable-target mx-auto mb-6 sm:mb-8 text-2xl sm:text-3xl md:text-[40px] font-medium leading-[1.12] tracking-[-0.03em]"
              style={{ maxWidth: 740 }}
            >
              <style>{`[data-editor-field-path="title"] em { color: var(--preview-primary-color, #10b981); font-style: italic; }`}</style>
              {renderRichText(f.title, vars)}
            </div>
            <div
              data-editor-field-path="text"
              className="preview-editable-target mx-auto mb-6 sm:mb-8 text-sm sm:text-[15px] leading-[1.75]"
              style={{ maxWidth: 580, opacity: 0.65 }}
            >
              {renderRichText(f.text, vars)}
            </div>
            <div className="mx-auto h-px w-14" style={{ background: "rgba(128,128,128,0.2)" }} />
          </div>
        );
      }

      return (
        <div className="introduction-bar-grid py-3 sm:py-4">
          <div
            className="rounded-sm"
            style={{
              background: `linear-gradient(180deg, var(--preview-primary-color, #10b981), color-mix(in srgb, var(--preview-primary-color, #10b981) 60%, #000000))`,
              alignSelf: "stretch",
              minHeight: 220,
            }}
          />
          <div className="py-2" style={{ maxWidth: 700 }}>
            <div className="mb-4 sm:mb-5 flex flex-wrap items-center gap-2 sm:gap-3">
              <span
                className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[.22em]"
                style={{ color: "var(--preview-primary-color, #10b981)" }}
              >
                Introdução
              </span>
              <span className="text-sm sm:text-[15px] font-semibold tracking-[-0.005em]">
                <span style={{ opacity: 0.4, fontWeight: 300 }}>— </span>
                {greeting} {clientName}
              </span>
            </div>
            <div
              data-editor-field-path="title"
              className="preview-editable-target mb-4 sm:mb-7 text-2xl sm:text-3xl md:text-[34px] font-medium leading-[1.15] tracking-[-0.03em]"
              style={{ maxWidth: 660 }}
            >
              {renderRichText(f.title, vars)}
            </div>
            <div
              data-editor-field-path="text"
              className="preview-editable-target text-sm sm:text-[15px] leading-[1.75]"
              style={{ maxWidth: 600, opacity: 0.75 }}
            >
              {renderRichText(f.text, vars)}
            </div>
          </div>
        </div>
      );
    }
    case "custom":
      return (
        <div
          data-editor-field-path="text"
          className="preview-rich-content max-w-none"
          dangerouslySetInnerHTML={safeHtml(
            replaceVariablesServerSafe(
              String(f.text ?? section.content ?? "<p></p>"),
              vars as unknown as Record<string, string>
            )
          )}
        />
      );
    case "storage_backup": {
      const cap = tpl(f.batteryCapacityKwh || "{{capacidade_bateria_kwh}}", vars);
      const backupPwr = tpl(f.backupPowerKw || "5.0 kW", vars);
      const autonomy = tpl(f.autonomyHours || "8 a 14 horas", vars);
      const switchTime = tpl(f.switchTimeMs || "< 10ms", vars);
      const tech = tpl(f.batteryTechnology || "LiFePO4 Lítio Ferro Fosfato (6.000 ciclos)", vars);
      const sysType = String(f.systemType || "hybrid");

      const sysTypeLabel =
        sysType === "off_grid"
          ? "Sistema Off-Grid Autónomo"
          : sysType === "zero_grid"
            ? "Sistema Zero Grid com Baterias"
            : "Sistema Híbrido Conectado com Backup (BESS)";

      return (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3.5 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold border shadow-2xs"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--preview-primary-color, #059669) 12%, #ffffff)",
                  borderColor:
                    "color-mix(in srgb, var(--preview-primary-color, #059669) 25%, transparent)",
                  color: "var(--preview-primary-color, #059669)",
                }}
              >
                🔋
              </span>
              <div>
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--preview-primary-color, #059669)" }}
                >
                  {sysTypeLabel}
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Armazenamento de alta performance e segurança energética ininterrupta
                </p>
              </div>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border shadow-2xs"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--preview-primary-color, #059669) 10%, #ffffff)",
                borderColor:
                  "color-mix(in srgb, var(--preview-primary-color, #059669) 25%, transparent)",
                color: "var(--preview-primary-color, #059669)",
              }}
            >
              ⚡ Exclusivo Híbrido / Off-Grid
            </span>
          </div>

          <div
            data-editor-field-path="text"
            className="preview-editable-target text-sm leading-relaxed text-slate-700 dark:text-slate-300 max-w-3xl"
          >
            {renderRichText(f.text, vars)}
          </div>

          {/* Hero Card BESS Arquitetônico - Fundo 100% Sólido */}
          <div className="rounded-2xl border p-5 sm:p-6 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Coluna Esquerda: Bateria & Indicador Modular */}
              <div className="md:col-span-5 flex flex-col justify-between border-b md:border-b-0 md:border-r pb-5 md:pb-0 md:pr-6 border-slate-200 dark:border-slate-800">
                <span
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--preview-primary-color, #059669)" }}
                >
                  Capacidade de Armazenamento
                </span>
                <div
                  className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50"
                  data-editor-field-path="batteryCapacityKwh"
                >
                  {cap || "10,24 kWh"}
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Energia útil disponível para fornecimento contínuo
                </p>

                {/* Barras de células com cor primária */}
                <div className="mt-4 flex gap-1.5">
                  {[1, 2, 3, 4].map((barIdx) => (
                    <div
                      key={barIdx}
                      className="h-2 flex-1 rounded-full shadow-2xs"
                      style={{ backgroundColor: "var(--preview-primary-color, #059669)" }}
                      title="Módulo de bateria 100% calibrado"
                    />
                  ))}
                </div>

                <div
                  className="mt-3 flex items-center gap-2 text-[11px] font-medium"
                  style={{ color: "var(--preview-primary-color, #059669)" }}
                >
                  <span
                    className="h-2 w-2 rounded-full animate-pulse"
                    style={{ backgroundColor: "var(--preview-primary-color, #059669)" }}
                  />
                  <span>Tecnologia {tech}</span>
                </div>
              </div>

              {/* Coluna Direita: 4 Métricas Chave com Fundos 100% Sólidos */}
              <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border p-3.5 bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--preview-primary-color, #059669)" }}
                  >
                    Potência de Backup EPS
                  </span>
                  <div
                    className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100"
                    data-editor-field-path="backupPowerKw"
                  >
                    {backupPwr}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Alimentação contínua de cargas
                  </span>
                </div>

                <div className="rounded-xl border p-3.5 bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Comutação No-Break
                  </span>
                  <div
                    className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100"
                    data-editor-field-path="switchTimeMs"
                  >
                    {switchTime}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Acionamento imperceptível
                  </span>
                </div>

                <div className="rounded-xl border p-3.5 bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Autonomia Estimada
                  </span>
                  <div
                    className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100"
                    data-editor-field-path="autonomyHours"
                  >
                    {autonomy}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Para circuitos prioritários
                  </span>
                </div>

                <div className="rounded-xl border p-3.5 bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--preview-primary-color, #059669)" }}
                  >
                    Vida Útil & Garantia
                  </span>
                  <div className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
                    10 Anos · +6.000 Ciclos
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sem risco de degradação térmica
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    case "hybrid_flow": {
      const eyebrow = tpl(f.eyebrow || "Energia Ininterrupta 24h", vars);
      const title = tpl(f.title || "Como Funciona o Seu Sistema Solar Híbrido", vars);
      const daytimeDesc = tpl(
        f.daytimeDescription ||
          "Geração solar alimenta o consumo diurno e o excedente carrega o banco de baterias a custo zero.",
        vars
      );
      const nighttimeDesc = tpl(
        f.nighttimeDescription ||
          "Ao anoitecer, as baterias suprem a casa evitando tarifas caras da concessionária no horário de ponta.",
        vars
      );
      const blackoutDesc = tpl(
        f.blackoutDescription ||
          "Em caso de apagão na rede externa, o sistema comuta em < 10ms mantendo tudo 100% funcionando.",
        vars
      );
      const switchTime = tpl(f.switchTime || "< 10ms", vars);
      const independence = tpl(f.gridIndependencePct || "Até 95% de independência", vars);

      return (
        <div className="space-y-5">
          <div className="border-b pb-3 border-slate-200 dark:border-slate-800">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--preview-primary-color, #059669)" }}
            >
              {eyebrow}
            </span>
            <h3 className="mt-1 text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50">
              {title}
            </h3>
            {f.text ? (
              <div className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                {renderRichText(f.text, vars)}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Dia - Fundo 100% Sólido */}
            <div className="rounded-xl border p-4 sm:p-5 flex flex-col justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold shadow-2xs"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--preview-primary-color, #059669) 14%, #ffffff)",
                    color: "var(--preview-primary-color, #059669)",
                  }}
                >
                  ☀️
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--preview-primary-color, #059669) 10%, #ffffff)",
                    borderColor:
                      "color-mix(in srgb, var(--preview-primary-color, #059669) 25%, transparent)",
                    color: "var(--preview-primary-color, #059669)",
                  }}
                >
                  01. Dia
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1.5">
                Geração & Recarga Solar
              </h4>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 flex-1">
                {daytimeDesc}
              </p>
              <div
                className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold flex items-center gap-1.5"
                style={{ color: "var(--preview-primary-color, #059669)" }}
              >
                <span>⚡ Carga 100% gratuita do Sol</span>
              </div>
            </div>

            {/* Card 2: Noite - Fundo 100% Sólido */}
            <div className="rounded-xl border p-4 sm:p-5 flex flex-col justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-bold text-base shadow-2xs">
                  🌙
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded">
                  02. Noite
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1.5">
                Autoconsumo das Baterias
              </h4>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 flex-1">
                {nighttimeDesc}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <span>🛡️ Fuga das tarifas de ponta</span>
              </div>
            </div>

            {/* Card 3: Queda de Rede (EPS) - Fundo 100% Sólido */}
            <div className="rounded-xl border p-4 sm:p-5 flex flex-col justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold shadow-2xs"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--preview-primary-color, #059669) 14%, #ffffff)",
                    color: "var(--preview-primary-color, #059669)",
                  }}
                >
                  ⚡
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--preview-primary-color, #059669) 10%, #ffffff)",
                    borderColor:
                      "color-mix(in srgb, var(--preview-primary-color, #059669) 25%, transparent)",
                    color: "var(--preview-primary-color, #059669)",
                  }}
                >
                  03. Queda de Rede
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1.5">
                No-Break Instantâneo EPS
              </h4>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 flex-1">
                {blackoutDesc}
              </p>
              <div
                className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold flex items-center gap-1.5"
                style={{ color: "var(--preview-primary-color, #059669)" }}
              >
                <span>⏱️ Resposta rápida em {switchTime}</span>
              </div>
            </div>
          </div>

          {/* Banner inferior de segurança - Fundo 100% Sólido */}
          <div className="rounded-xl border p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-base">🛡️</span>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Segurança energética residencial e corporativa: {independence}
              </span>
            </div>
            <span
              className="text-[11px] font-bold"
              style={{ color: "var(--preview-primary-color, #059669)" }}
            >
              Operação 100% Automática
            </span>
          </div>
        </div>
      );
    }
    case "critical_loads_autonomy": {
      const eyebrow = tpl(f.eyebrow || "Segurança & Conforto", vars);
      const title = tpl(f.title || "Cargas Críticas Protegidas contra Quedas de Energia", vars);
      const autonomy = tpl(f.estimatedAutonomy || "12 a 24 horas", vars);
      const lifespan = tpl(f.batteryLifespan || "Mais de 15 anos (6.000 a 8.000 ciclos)", vars);

      return (
        <div className="space-y-5">
          <div className="border-b pb-3 border-slate-200 dark:border-slate-800">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--preview-primary-color, #059669)" }}
            >
              {eyebrow}
            </span>
            <h3 className="mt-1 text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50">
              {title}
            </h3>
            {f.text ? (
              <div className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                {renderRichText(f.text, vars)}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Lista de Circuitos Prioritários - Fundos 100% Sólidos */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Circuitos & Eletrodomésticos Protegidos
                </span>
                <span
                  className="text-[11px] font-bold"
                  style={{ color: "var(--preview-primary-color, #059669)" }}
                >
                  Autonomia: {autonomy}
                </span>
              </div>

              <div className="space-y-2">
                {[
                  {
                    icon: "🧊",
                    name: "Geladeira & Freezers",
                    benefit: "Alimentos e medicamentos protegidos contra estragos durante apagões.",
                  },
                  {
                    icon: "💻",
                    name: "Home Office & Internet Wi-Fi",
                    benefit:
                      "Conexão sem oscilação; reuniões e trabalho mantidos sem interrupções.",
                  },
                  {
                    icon: "💡",
                    name: "Iluminação Estratégica & Tomadas",
                    benefit: "Pontos essenciais da residência ou empresa 100% iluminados e ativos.",
                  },
                  {
                    icon: "🚪",
                    name: "Portão Eletrônico, Câmeras & Alarme",
                    benefit: "Segurança perimetral e controle de acesso operando normalmente.",
                  },
                ].map((load, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border p-3 flex items-start gap-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
                  >
                    <span className="text-lg shrink-0 mt-0.5">{load.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {load.name}
                        </span>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded border"
                          style={{
                            backgroundColor:
                              "color-mix(in srgb, var(--preview-primary-color, #059669) 10%, #ffffff)",
                            borderColor:
                              "color-mix(in srgb, var(--preview-primary-color, #059669) 25%, transparent)",
                            color: "var(--preview-primary-color, #059669)",
                          }}
                        >
                          Ativo
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        {load.benefit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparativo Bateria vs Gerador - Fundo 100% Sólido */}
            <div className="lg:col-span-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Por que Bateria Solar e Não um Gerador?
                </span>

                <div className="mt-3 rounded-2xl border overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="grid grid-cols-2 text-center text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                    <div
                      className="p-2.5 font-bold"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--preview-primary-color, #059669) 12%, #ffffff)",
                        color: "var(--preview-primary-color, #059669)",
                      }}
                    >
                      ⚡ Bateria Solar LiFePO4
                    </div>
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      ⛽ Gerador a Combustível
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {[
                      {
                        label: "Ruído",
                        solar: "100% Silencioso (Zero Ruído)",
                        gen: "Barulho alto e incômodo",
                      },
                      {
                        label: "Combustível",
                        solar: "Energia Solar 100% Gratuita",
                        gen: "Gasolina/Diesel caro e inflamável",
                      },
                      {
                        label: "Partida",
                        solar: "Automática em < 10ms",
                        gen: "Manual ou atrasada com falhas",
                      },
                      {
                        label: "Poluição",
                        solar: "Zero Fumaça ou Emissões",
                        gen: "Gases tóxicos e fuligem",
                      },
                      {
                        label: "Manutenção",
                        solar: "Zero Peças Móveis",
                        gen: "Troca de óleo, velas e filtros",
                      },
                    ].map((row, rIdx) => (
                      <div key={rIdx} className="grid grid-cols-2 p-2.5 bg-white dark:bg-slate-900">
                        <div
                          className="font-semibold flex items-center gap-1.5"
                          style={{ color: "var(--preview-primary-color, #059669)" }}
                        >
                          <span className="text-xs">✓</span> {row.solar}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <span className="text-xs">✗</span> {row.gen}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border p-3 flex items-center justify-between text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Durabilidade do Banco de Baterias:
                </span>
                <strong className="text-slate-900 dark:text-slate-100 font-bold">{lifespan}</strong>
              </div>
            </div>
          </div>
        </div>
      );
    }
    case "about_company": {
      const isPdf = renderMode === "pdf";
      const variant = String(section.variant ?? "hero");

      if (variant === "hero") {
        const bgImage = resolveDisplayAssetUrl(f.image);
        const eyebrow = tpl(f.eyebrow || "Sobre nós", vars);
        const statsRaw = asObjectArray<{ value?: unknown; suffix?: unknown; label?: unknown }>(
          f.stats
        );
        return (
          <div
            data-editor-field-path="image"
            className="relative flex items-center px-4 py-8 sm:py-10 md:py-12"
            style={{
              minHeight: 360,
              ...(bgImage
                ? {
                    backgroundImage: `url(${bgImage})`,
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                  }
                : {}),
            }}
          >
            {bgImage && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(115deg, rgb(var(--preview-background-rgb, 11 27 43) / 0.85) 0%, rgb(var(--preview-background-rgb, 11 27 43) / 0.45) 55%, transparent 100%)",
                }}
              />
            )}
            <div style={{ maxWidth: 520, position: "relative", zIndex: 2 }}>
              <div
                data-editor-field-path="eyebrow"
                className="preview-editable-target mb-4 sm:mb-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.14em]"
                style={{ color: "var(--preview-primary-color, #10b981)" }}
              >
                <span
                  className="inline-block h-px w-8"
                  style={{ background: "var(--preview-primary-color, #10b981)" }}
                />
                {eyebrow}
              </div>
              <div
                data-editor-field-path="title"
                className="preview-editable-target mb-4 sm:mb-5 text-2xl sm:text-3xl md:text-[40px] font-light leading-[1.08] tracking-[-0.025em]"
              >
                <style>{`[data-editor-field-path="title"] em { color: var(--preview-primary-color, #10b981); font-style: italic; }`}</style>
                {renderRichText(f.title || tpl("Sobre a {{nome_empresa}}", vars), vars)}
              </div>
              <div
                data-editor-field-path="text"
                className="preview-editable-target mb-6 sm:mb-8 text-sm sm:text-[15px] leading-[1.6]"
                style={{ opacity: 0.75 }}
              >
                {renderRichText(f.text, vars)}
              </div>
              {statsRaw.length > 0 && (
                <div
                  data-editor-field-path="stats"
                  className="about-company-hero-stats border-t border-current pt-6"
                >
                  {statsRaw.map((stat, i) => (
                    <div key={i}>
                      <div
                        className="text-2xl sm:text-[32px] font-light leading-none tracking-[-0.02em]"
                        style={{ fontFamily: "inherit" }}
                      >
                        <span data-editor-field-path={`stats[${i}].value`}>
                          {tpl(stat.value, vars)}
                        </span>
                        <span
                          data-editor-field-path={`stats[${i}].suffix`}
                          style={{ color: "var(--preview-primary-color, #10b981)" }}
                        >
                          {tpl(stat.suffix, vars)}
                        </span>
                      </div>
                      <div
                        data-editor-field-path={`stats[${i}].label`}
                        className="mt-1.5 text-[11px] uppercase tracking-[.05em]"
                        style={{ opacity: 0.6 }}
                      >
                        {tpl(stat.label, vars)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      if (variant === "editorial-split") {
        const bgImage = resolveDisplayAssetUrl(f.image);
        const eyebrow = tpl(f.eyebrow || "— Quem somos", vars);
        const signature = tpl(f.signature || "", vars);
        const badgeValue = tpl(f.badge_value || "", vars);
        const badgeLabel = tpl(f.badge_label || "", vars);
        return (
          <div className="about-company-editorial-split" style={{ alignItems: "center" }}>
            <div className="py-2 sm:py-4">
              <div
                data-editor-field-path="eyebrow"
                className="preview-editable-target mb-3 text-[13px] italic"
                style={{ color: "var(--preview-primary-color, #10b981)", fontFamily: "inherit" }}
              >
                {eyebrow}
              </div>
              <div
                data-editor-field-path="title"
                className="preview-editable-target mb-4 sm:mb-5 text-2xl sm:text-3xl md:text-[36px] font-light leading-[1.08] tracking-[-0.025em]"
              >
                {renderRichText(f.title, vars)}
              </div>
              <div
                data-editor-field-path="text"
                className="preview-editable-target text-sm sm:text-[15px] leading-[1.7]"
                style={{ opacity: 0.65 }}
              >
                {renderRichText(f.text, vars)}
              </div>
              {signature && (
                <div
                  data-editor-field-path="signature"
                  className="preview-editable-target mt-5 flex items-center gap-3 text-[13px] font-medium"
                >
                  <span
                    className="inline-block h-px w-6 shrink-0"
                    style={{ background: "currentColor" }}
                  />
                  {signature}
                </div>
              )}
            </div>
            <div
              data-editor-field-path="image"
              className="about-company-editorial-media relative overflow-hidden rounded-sm"
              style={{
                background: bgImage
                  ? `url(${bgImage}) center/cover`
                  : "color-mix(in srgb, var(--preview-secondary-color, #0f172a) 20%, transparent)",
              }}
            >
              {(badgeValue || badgeLabel) && (
                <div
                  className="absolute bottom-4 left-4 sm:bottom-5 sm:left-5 rounded-sm px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-xl backdrop-blur-sm"
                  style={{
                    maxWidth: 200,
                    background: "rgb(var(--preview-background-rgb, 11 27 43) / 0.95)",
                    color: "inherit",
                  }}
                >
                  <div
                    data-editor-field-path="badge_value"
                    className="text-2xl sm:text-[28px] font-light leading-none tracking-[-0.02em]"
                    style={{ fontFamily: "inherit" }}
                  >
                    {badgeValue}
                  </div>
                  <div
                    data-editor-field-path="badge_label"
                    className="mt-1 text-[11px] uppercase tracking-[.04em] opacity-60"
                  >
                    {badgeLabel}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      if (variant === "process-steps") {
        const eyebrow = tpl(f.eyebrow || "Sobre a empresa", vars);
        return (
          <div
            className="rounded-xl p-5 sm:p-8 md:p-10"
            style={{
              background: "rgba(250,247,242,0.06)",
              border: "1px solid rgba(var(--preview-background-rgb, 15 23 42), 0.08)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full"
              style={{
                background: `radial-gradient(circle, var(--preview-primary-color, #10b981) 0%, transparent 70%)`,
                opacity: 0.12,
                transform: "translate(30%, -30%)",
              }}
            />
            <div
              className="about-company-process-steps-grid relative mb-6 sm:mb-10"
              style={{ alignItems: "end" }}
            >
              <div>
                <div
                  data-editor-field-path="eyebrow"
                  className="preview-editable-target mb-3 text-[11px] font-semibold uppercase tracking-[.18em]"
                  style={{ color: "var(--preview-primary-color, #10b981)" }}
                >
                  {eyebrow}
                </div>
                <div
                  data-editor-field-path="title"
                  className="preview-editable-target text-xl sm:text-2xl md:text-[30px] font-light leading-[1.1] tracking-[-0.02em]"
                >
                  {renderRichText(f.title, vars)}
                </div>
              </div>
              <div
                data-editor-field-path="text"
                className="preview-editable-target text-sm sm:text-[15px] leading-[1.7]"
                style={{ opacity: 0.65 }}
              >
                {renderRichText(f.text, vars)}
              </div>
            </div>
          </div>
        );
      }

      if (variant === "split-proof") {
        const bgImage = resolveDisplayAssetUrl(f.image);
        const eyebrow = tpl(f.eyebrow || "Sobre a empresa", vars);
        const tagTop = tpl(f.tag_top || "", vars);
        const badgeValue = tpl(f.badge_value || "", vars);
        const badgeLabel = tpl(f.badge_label || "", vars);
        const featuresRaw = asObjectArray<{ title?: unknown; description?: unknown }>(f.features);
        return (
          <div
            className="about-company-split-proof"
            style={{
              backgroundColor: "color-mix(in srgb, currentColor 4%, transparent)",
              borderColor: "color-mix(in srgb, currentColor 12%, transparent)",
            }}
          >
            <div
              data-editor-field-path="image"
              className="about-company-split-proof-media"
              style={{
                background: bgImage
                  ? `url(${bgImage}) center/cover`
                  : `var(--preview-secondary-color, #0f172a)`,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45) 100%)",
                }}
              />
              <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
                {tagTop && (
                  <div
                    data-editor-field-path="tag_top"
                    className="inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-[11px] sm:text-[12px] font-medium backdrop-blur-sm"
                    style={{
                      background: isPdf
                        ? "rgba(11, 18, 32, 0.88)"
                        : "rgb(var(--preview-background-rgb, 15 23 42) / 0.92)",
                      color: isPdf ? "#f8fafc" : "inherit",
                      border: isPdf ? "1px solid rgba(255, 255, 255, 0.15)" : undefined,
                    }}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: "var(--preview-primary-color, #10b981)" }}
                    />
                    {tagTop}
                  </div>
                )}
                {(badgeValue || badgeLabel) && (
                  <div
                    className="self-end rounded-xl p-3 sm:p-4 shadow-xl backdrop-blur-sm"
                    style={{
                      maxWidth: 180,
                      background: isPdf
                        ? "rgba(11, 18, 32, 0.92)"
                        : "rgb(var(--preview-background-rgb, 15 23 42) / 0.95)",
                      color: isPdf ? "#f8fafc" : "inherit",
                      border: isPdf ? "1px solid rgba(255, 255, 255, 0.15)" : undefined,
                    }}
                  >
                    <div
                      data-editor-field-path="badge_value"
                      className="text-2xl sm:text-[34px] font-light leading-none tracking-[-0.02em]"
                      style={{ fontFamily: "inherit", color: isPdf ? "#f8fafc" : undefined }}
                    >
                      {badgeValue}
                    </div>
                    <div
                      data-editor-field-path="badge_label"
                      className="mt-1 text-[10px] sm:text-[12px] leading-[1.3] opacity-75 uppercase tracking-wide"
                      style={{ color: isPdf ? "#cbd5e1" : undefined }}
                    >
                      {badgeLabel}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="about-company-split-proof-content">
              <div
                data-editor-field-path="eyebrow"
                className="preview-editable-target mb-2 sm:mb-3 text-[11px] font-semibold uppercase tracking-[.18em]"
                style={{ color: "var(--preview-primary-color, #10b981)" }}
              >
                {eyebrow}
              </div>
              <div
                data-editor-field-path="title"
                className="preview-editable-target mb-3 sm:mb-4 text-xl sm:text-2xl md:text-[28px] font-medium leading-[1.15] tracking-[-0.02em]"
              >
                {renderRichText(f.title, vars)}
              </div>
              <div
                data-editor-field-path="text"
                className="preview-editable-target mb-5 sm:mb-6 text-sm sm:text-[14px] leading-[1.7] opacity-85"
              >
                {renderRichText(f.text, vars)}
              </div>
              {featuresRaw.length > 0 && (
                <div data-editor-field-path="features" className="grid gap-2.5 sm:gap-3">
                  {featuresRaw.map((feat, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-[13px]"
                    >
                      <div
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background:
                            "color-mix(in srgb, var(--preview-primary-color, #10b981) 15%, transparent)",
                          color: "var(--preview-primary-color, #10b981)",
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div>
                        <strong
                          data-editor-field-path={`features[${i}].title`}
                          className="block font-semibold"
                        >
                          {tpl(feat.title, vars)}
                        </strong>
                        <span
                          data-editor-field-path={`features[${i}].description`}
                          className="opacity-75"
                        >
                          {tpl(feat.description, vars)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      if (variant === "manifesto") {
        const metaValue = tpl(f.meta_value || "", vars);
        const metaLabel = tpl(f.meta_label || "", vars);
        return (
          <div className="about-company-manifesto-container relative overflow-hidden rounded-xl">
            <div
              className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full"
              style={{
                background: `radial-gradient(circle at 30% 30%, var(--preview-primary-color, #10b981) 0%, transparent 50%), radial-gradient(circle at 70% 70%, var(--preview-primary-color, #10b981) 0%, transparent 60%)`,
                opacity: 0.15,
                filter: "blur(20px)",
              }}
            />
            <div
              className="relative z-10 mb-3 block text-5xl sm:text-6xl md:text-[80px] leading-[0.75]"
              style={{ color: "var(--preview-primary-color, #10b981)", fontFamily: "inherit" }}
            >
              "
            </div>
            <div
              data-editor-field-path="quote"
              className="preview-editable-target relative z-10 mb-6 sm:mb-10 text-2xl sm:text-3xl md:text-[38px] font-light leading-[1.1] tracking-[-0.025em]"
              style={{ maxWidth: 680 }}
            >
              <style>{`[data-editor-field-path="quote"] em { color: var(--preview-primary-color, #10b981); font-style: italic; }`}</style>
              {renderRichText(f.quote, vars)}
            </div>
            <div className="about-company-manifesto-footer relative z-10 border-t border-current pt-6 sm:pt-8">
              <div
                data-editor-field-path="text"
                className="preview-editable-target text-sm sm:text-[15px] leading-[1.7]"
                style={{ opacity: 0.7 }}
              >
                {renderRichText(f.text, vars)}
              </div>
              {(metaValue || metaLabel) && (
                <div
                  className="text-left sm:text-right text-[12px] leading-[1.6]"
                  style={{ opacity: 0.7 }}
                >
                  <strong
                    data-editor-field-path="meta_value"
                    className="mb-0.5 block text-lg sm:text-[22px] font-light"
                    style={{
                      color: "var(--preview-primary-color, #10b981)",
                      fontFamily: "inherit",
                      opacity: 1,
                    }}
                  >
                    {metaValue}
                  </strong>
                  <span data-editor-field-path="meta_label">{metaLabel}</span>
                </div>
              )}
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-3">
          <div data-editor-field-path="text" className="preview-editable-target">
            {renderRichText(f.text, vars)}
          </div>
          {String(f.image ?? "") ? (
            <div className="proposal-photo-frame aspect-[16/9] w-full max-h-56 overflow-hidden rounded-lg border border-zinc-700/60 bg-black/10">
              <img
                data-editor-field-path="image"
                src={resolveDisplayAssetUrl(f.image)}
                alt="Empresa ou equipe"
                className="h-full w-full object-cover object-center"
              />
            </div>
          ) : null}
        </div>
      );
    }
    case "diagnostic_energy": {
      const monthlyBillRaw = vars.conta_mensal_energia;
      if (
        typeof monthlyBillRaw !== "number" ||
        !Number.isFinite(monthlyBillRaw) ||
        monthlyBillRaw <= 0
      ) {
        return <></>;
      }
      const monthlyBill = monthlyBillRaw;
      const painPoints = asIconTextItems(f.painPoints);
      const impacts = asIconTextItems(f.impact);
      const HighlightIcon = resolveLucideIcon(String(f.highlightIcon ?? "zap"));
      const painIconColor = resolveIconColor(
        f.painIconColor,
        "var(--preview-primary-color, #10b981)"
      );
      const impactIconColor = resolveIconColor(
        f.impactIconColor,
        "var(--preview-secondary-color, #38bdf8)"
      );
      const highlightIconColor = resolveIconColor(
        f.highlightIconColor,
        "var(--preview-primary-color, #10b981)"
      );
      const diagnosticLayout = resolveSectionVariantServerSafe(
        "diagnostic_energy",
        String(section.variant ?? "topics")
      );
      const isCardLayout = diagnosticLayout === "cards";
      const isListLayout = diagnosticLayout === "list";
      const isTopicsLayout = diagnosticLayout === "topics" || (!isCardLayout && !isListLayout);
      const hAlign = resolveSectionHorizontalAlignment(section);
      const diagnosticListLayoutClass = isCardLayout
        ? `diagnostic-energy-cards-grid grid gap-2 ${benefitGridJustifyItemsClass(hAlign)}`
        : `flex flex-col gap-1.5 ${benefitRowsCrossAxisClass(hAlign)}`;
      const diagnosticRowMainAxisClass = isCardLayout
        ? hAlign === "center"
          ? "w-full justify-center"
          : hAlign === "right"
            ? "w-full justify-end"
            : "w-full justify-start"
        : "";
      const annualCost = vars.gasto_anual_energia ?? monthlyBill * 12;
      const projected5y = vars.custo_5_anos_energia;
      const projected10y = vars.custo_10_anos_energia;
      const metricCardStyle: CSSProperties = {
        borderColor: "color-mix(in srgb, currentColor 14%, #e2e8f0)",
        backgroundColor: "#ffffff",
        boxShadow: "0 2px 10px rgba(2, 6, 23, 0.04), 0 1px 3px rgba(2, 6, 23, 0.02)",
      };
      const buildDiagnosticCardStyle = (accentColor: string): CSSProperties => ({
        color: "currentColor",
        borderRadius: "0.875rem",
        padding: "0.75rem",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: `color-mix(in srgb, ${accentColor} 40%, #e2e8f0)`,
        backgroundColor: "#ffffff",
        boxShadow: "0 2px 8px rgba(2, 6, 23, 0.04)",
      });
      return (
        <div className="space-y-4">
          <div data-editor-field-path="text" className="preview-editable-target">
            {renderRichText(f.text, vars)}
          </div>
          <div className="diagnostic-energy-metrics-grid grid gap-2">
            <div className="rounded-2xl border px-4 py-3" style={metricCardStyle}>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] opacity-65">
                Gasto mensal
              </p>
              <p className="mt-1 text-base font-semibold">
                {vars.conta_mensal_energia_br ?? toCurrency(monthlyBill)}
              </p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={metricCardStyle}>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] opacity-65">
                Gasto anual
              </p>
              <p className="mt-1 text-base font-semibold">
                {vars.gasto_anual_energia_br ?? toCurrency(annualCost)}
              </p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={metricCardStyle}>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] opacity-65">
                Custo em 5 anos
              </p>
              <p className="mt-1 text-base font-semibold">
                {vars.custo_5_anos_energia_br ?? toCurrency(projected5y ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={metricCardStyle}>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] opacity-65">
                Custo em 10 anos
              </p>
              <p className="mt-1 text-base font-semibold">
                {vars.custo_10_anos_energia_br ?? toCurrency(projected10y ?? 0)}
              </p>
            </div>
          </div>
          {painPoints.length ? (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">
                Principais dores
              </p>
              <div data-editor-field-path="painPoints" className={diagnosticListLayoutClass}>
                {painPoints.map((item, index) => {
                  const ItemIcon = resolveLucideIcon(item.icon);
                  const resolvedPainText = replaceVariablesServerSafe(
                    item.text,
                    vars as unknown as Record<string, string | number>
                  );
                  const painCardSurfaceStyle: CSSProperties = isCardLayout
                    ? buildDiagnosticCardStyle(painIconColor)
                    : isTopicsLayout
                      ? { color: "currentColor" }
                      : {};
                  return (
                    <div
                      key={`pain-${index}`}
                      className={
                        isCardLayout
                          ? `relative overflow-hidden ${diagnosticRowMainAxisClass}`
                          : `flex items-start gap-2 ${diagnosticRowMainAxisClass} ${
                              isListLayout
                                ? "rounded-lg border border-white/10 bg-zinc-900/25 p-2"
                                : ""
                            }`
                      }
                      style={painCardSurfaceStyle}
                    >
                      {isCardLayout ? (
                        <div className="diagnostic-energy-item-body relative w-full">
                          <ItemIcon
                            data-editor-field-path={`painPoints[${index}].icon`}
                            className="diagnostic-energy-item-watermark absolute"
                            style={{ color: painIconColor, opacity: 0.16 }}
                          />
                          <p
                            data-editor-field-path={`painPoints[${index}].text`}
                            className="diagnostic-energy-item-text relative z-[1] text-sm font-medium leading-snug"
                          >
                            {resolvedPainText}
                          </p>
                        </div>
                      ) : (
                        <>
                          <ItemIcon
                            data-editor-field-path={`painPoints[${index}].icon`}
                            className="mt-0.5 h-4 w-4 shrink-0 opacity-95"
                            style={{ color: painIconColor }}
                          />
                          {isTopicsLayout ? (
                            <span
                              data-editor-field-path={`painPoints[${index}].text`}
                              className="text-sm leading-snug"
                            >
                              {resolvedPainText}
                            </span>
                          ) : (
                            <span data-editor-field-path={`painPoints[${index}].text`}>
                              {resolvedPainText}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {impacts.length ? (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400">
                Impactos financeiros
              </p>
              <div data-editor-field-path="impact" className={diagnosticListLayoutClass}>
                {impacts.map((item, index) => {
                  const ItemIcon = resolveLucideIcon(item.icon);
                  const resolvedImpactText = replaceVariablesServerSafe(
                    item.text,
                    vars as unknown as Record<string, string | number>
                  );
                  const impactCardSurfaceStyle: CSSProperties = isCardLayout
                    ? buildDiagnosticCardStyle(impactIconColor)
                    : isTopicsLayout
                      ? { color: "currentColor" }
                      : {};
                  return (
                    <div
                      key={`impact-${index}`}
                      className={
                        isCardLayout
                          ? `relative overflow-hidden ${diagnosticRowMainAxisClass}`
                          : `flex items-start gap-2 ${diagnosticRowMainAxisClass} ${
                              isListLayout
                                ? "rounded-lg border border-white/10 bg-zinc-900/25 p-2"
                                : ""
                            }`
                      }
                      style={impactCardSurfaceStyle}
                    >
                      {isCardLayout ? (
                        <div className="diagnostic-energy-item-body relative w-full">
                          <ItemIcon
                            data-editor-field-path={`impact[${index}].icon`}
                            className="diagnostic-energy-item-watermark absolute"
                            style={{ color: impactIconColor, opacity: 0.16 }}
                          />
                          <p
                            data-editor-field-path={`impact[${index}].text`}
                            className="diagnostic-energy-item-text relative z-[1] text-sm font-medium leading-snug"
                          >
                            {resolvedImpactText}
                          </p>
                        </div>
                      ) : (
                        <>
                          <ItemIcon
                            data-editor-field-path={`impact[${index}].icon`}
                            className="mt-0.5 h-4 w-4 shrink-0 opacity-95"
                            style={{ color: impactIconColor }}
                          />
                          {isTopicsLayout ? (
                            <span
                              data-editor-field-path={`impact[${index}].text`}
                              className="text-sm leading-snug"
                            >
                              {resolvedImpactText}
                            </span>
                          ) : (
                            <span data-editor-field-path={`impact[${index}].text`}>
                              {resolvedImpactText}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {String(f.highlightText ?? "").trim() ? (
            <div
              data-editor-field-path="highlightText"
              className="rounded-xl border border-emerald-400/35 bg-emerald-500/12 p-3 shadow-sm"
            >
              <p className="flex items-center gap-2 font-medium">
                {}
                <HighlightIcon
                  className="h-4 w-4 shrink-0 opacity-95"
                  style={{ color: highlightIconColor }}
                />
                <span>
                  {replaceVariablesServerSafe(
                    String(f.highlightText ?? ""),
                    vars as unknown as Record<string, string | number>
                  )}
                </span>
              </p>
            </div>
          ) : null}
        </div>
      );
    }
    case "solution": {
      const solutionName = String(f.solutionName ?? "").trim();
      const benefits = asIconTextItems(f.benefits);
      const howItWorks = String(f.howItWorks ?? "").trim();
      const solutionLayout = resolveSectionVariantServerSafe("solution", section.variant);
      const isCardLayout = solutionLayout === "cards";
      const hAlign = resolveSectionHorizontalAlignment(section);
      const has3Cols = benefits.length >= 3 && benefits.length % 3 === 0;
      const benefitGridClass = `solution-benefits-grid ${has3Cols ? "has-3-cols" : ""} ${benefitGridJustifyItemsClass(hAlign)}`;

      return (
        <div className="solution-editorial-wrapper">
          {/* Cabeçalho com Badge & Título */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="solution-header-badge">
                <Sparkles className="h-3 w-3 shrink-0" />
                <span>Solução Sob Medida</span>
              </span>
            </div>

            {solutionName ? (
              <h4 data-editor-field-path="solutionName" className="solution-title-heading">
                {tpl(solutionName, vars)}
              </h4>
            ) : null}

            {f.text ? (
              <div
                data-editor-field-path="text"
                className="solution-rich-text preview-editable-target"
              >
                {renderRichText(f.text, vars)}
              </div>
            ) : null}
          </div>

          {/* Benefícios */}
          {benefits.length ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.1em]"
                  style={{ color: "var(--preview-primary-color, #22c55e)", opacity: 0.9 }}
                >
                  Diferenciais & Benefícios
                </p>
                <span className="text-[11px] font-medium opacity-60">
                  {benefits.length} {benefits.length === 1 ? "diferencial" : "diferenciais"}
                </span>
              </div>

              {isCardLayout ? (
                <div className={benefitGridClass}>
                  {benefits.map((item, index) => {
                    const ItemIcon = resolveLucideIcon(item.icon);
                    const label = replaceVariablesServerSafe(
                      item.text,
                      vars as unknown as Record<string, string | number>
                    );
                    return (
                      <div key={`sol-benefit-${index}`} className="solution-benefit-card">
                        <div className="solution-benefit-icon-box">
                          <ItemIcon
                            data-editor-field-path={`benefits[${index}].icon`}
                            className="h-4 w-4 shrink-0"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            data-editor-field-path={`benefits[${index}].text`}
                            className="solution-benefit-text"
                          >
                            {label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="solution-topics-list">
                  {benefits.map((item, index) => {
                    const ItemIcon = resolveLucideIcon(item.icon);
                    const label = replaceVariablesServerSafe(
                      item.text,
                      vars as unknown as Record<string, string | number>
                    );
                    return (
                      <div key={`sol-topic-${index}`} className="solution-topic-item">
                        <div className="solution-topic-icon">
                          <ItemIcon
                            data-editor-field-path={`benefits[${index}].icon`}
                            className="h-3 w-3 shrink-0"
                          />
                        </div>
                        <span
                          data-editor-field-path={`benefits[${index}].text`}
                          className="min-w-0 flex-1"
                        >
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {/* Box de Destaque 'Como Funciona' */}
          {howItWorks ? (
            <div data-editor-field-path="howItWorks" className="solution-how-it-works-card">
              <div className="solution-how-it-works-header">
                <Compass className="h-3.5 w-3.5 shrink-0" />
                <span>Como Funciona na Prática</span>
              </div>
              {howItWorks.includes("<") ? (
                <div
                  className="solution-how-it-works-body preview-rich-content max-w-none"
                  dangerouslySetInnerHTML={safeHtml(tpl(howItWorks, vars))}
                />
              ) : (
                <p className="solution-how-it-works-body">{tpl(howItWorks, vars)}</p>
              )}
            </div>
          ) : null}
        </div>
      );
    }
    case "generation_consumption": {
      const fields = section.fields as Record<string, unknown>;
      const b = options?.branding;
      const theme = {
        primary: b?.primaryColor ?? "#3b82f6",
        secondary: b?.secondaryColor ?? "#22c55e",
        text: b?.textColor ?? "#e5e7eb",
        background: b?.backgroundColor ?? "#0b1220",
      };
      const props = parseGenerationConsumptionFields(
        fields,
        theme,
        vars,
        options?.generationConsumptionChart ?? null
      );
      const subtitle = String(fields["sectionSubtitle"] ?? "").trim();
      const layout = resolveSectionVariantServerSafe("generation_consumption", section.variant);
      const variantForMode =
        layout === "modern_dashboard"
          ? "modern_dashboard"
          : layout === "modern"
            ? "modern"
            : "default";
      return (
        <div className="space-y-4">
          {subtitle ? (
            <p data-editor-field-path="sectionSubtitle" className="text-sm opacity-75">
              {tpl(subtitle, vars)}
            </p>
          ) : null}
          <SystemPerformanceSection
            {...props}
            intro={
              <div data-editor-field-path="text" className="preview-editable-target">
                {renderRichText(fields["text"], vars)}
              </div>
            }
            variant={variantForMode}
          />
        </div>
      );
    }
    case "proposal_equipment": {
      const fields = section.fields as Record<string, unknown>;
      const layout = resolveSectionVariantServerSafe("proposal_equipment", section.variant);
      const rawItems = resolveProposalEquipmentItemsForPreview(
        fields,
        options?.productCatalogById as Record<string, ProposalEquipmentProductSnapshot> | undefined
      );
      let items = filterVisibleProposalEquipmentItems(rawItems);
      if (!items.length) {
        items = filterVisibleProposalEquipmentItems(DEMO_PROPOSAL_EQUIPMENT_ITEMS);
      }
      const subtitle = String(fields["sectionSubtitle"] ?? "").trim();

      return (
        <div className="space-y-3">
          {subtitle ? (
            <p data-editor-field-path="sectionSubtitle" className="text-sm opacity-75">
              {tpl(subtitle, vars)}
            </p>
          ) : null}
          <div data-editor-field-path="text" className="preview-editable-target">
            {renderRichText(fields["text"], vars)}
          </div>
          <div data-editor-field-path="equipmentLines">
            {layout === "table"
              ? renderProposalEquipmentTable(items)
              : layout === "list"
                ? renderProposalEquipmentList(items)
                : renderProposalEquipmentCards(items)}
          </div>
        </div>
      );
    }
    case "gallery": {
      const variant = resolveSectionVariantServerSafe("gallery", section.variant);
      type GalleryItem = {
        photo?: unknown;
        image?: unknown;
        title?: unknown;
        description?: unknown;
      };
      const rawItems = asObjectArray<GalleryItem>(f.items);
      const legacyImages = asStringArray(f.images);
      const allItems: { image: string; title: string; description: string }[] = rawItems.length
        ? rawItems.map((it) => ({
            image: resolveDisplayAssetUrl(it.photo ?? it.image),
            title: tpl(it.title, vars),
            description: tpl(it.description, vars),
          }))
        : legacyImages.map((url) => ({
            image: resolveDisplayAssetUrl(url),
            title: "",
            description: "",
          }));
      const items = allItems.filter((it) => it.image || it.title.trim() || it.description.trim());

      const eyebrow = tpl(f.eyebrow || "Portfólio", vars);
      const titleText = tpl(f.title || "Galeria de obras", vars);
      const countLabelRaw = tpl(f.countLabel ?? "", vars).trim();
      const itemCount = items.length;

      const placeholderBox = (key: string, ratio: string, radius = 12) => (
        <div
          key={key}
          style={{
            aspectRatio: ratio,
            borderRadius: radius,
            border: "1px dashed rgba(128,128,128,0.35)",
            background: "color-mix(in srgb, var(--preview-primary-color, #10b981) 6%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(128,128,128,0.7)",
            fontSize: 11,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Imagem
        </div>
      );

      const imageBox = (image: string, ratio: string, radius = 12) =>
        image ? (
          <div
            style={{
              aspectRatio: ratio,
              borderRadius: radius,
              backgroundImage: `url(${image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              overflow: "hidden",
            }}
          />
        ) : null;

      const galleryHeader = (
        <header
          className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
          style={{
            marginBottom: 28,
            paddingBottom: 18,
            borderBottom: "1px solid rgba(128,128,128,0.18)",
          }}
        >
          <div>
            <div
              data-editor-field-path="eyebrow"
              className="preview-editable-target"
              style={{
                fontSize: 11,
                letterSpacing: ".22em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--preview-primary-color, #10b981)",
                marginBottom: 8,
              }}
            >
              {eyebrow}
            </div>
            <div
              data-editor-field-path="title"
              className="preview-editable-target"
              style={{
                fontWeight: 700,
                fontSize: 30,
                lineHeight: 1.1,
                letterSpacing: "-0.025em",
              }}
            >
              {titleText}
            </div>
          </div>
          {countLabelRaw && itemCount > 0 ? (
            <div
              data-editor-field-path="countLabel"
              style={{
                fontSize: 12,
                opacity: 0.65,
                letterSpacing: ".04em",
                whiteSpace: "nowrap",
                paddingBottom: 4,
              }}
            >
              <strong style={{ fontWeight: 600, opacity: 1 }}>{itemCount}</strong> {countLabelRaw}
            </div>
          ) : null}
        </header>
      );

      const emptyState = (
        <div
          data-editor-field-path="items"
          style={{
            border: "1px dashed rgba(128,128,128,0.3)",
            borderRadius: 12,
            padding: "32px 20px",
            textAlign: "center",
            color: "rgba(128,128,128,0.75)",
            fontSize: 13,
            background: "color-mix(in srgb, var(--preview-primary-color, #10b981) 4%, transparent)",
          }}
        >
          Adicione imagens para preencher a galeria.
        </div>
      );

      if (variant === "grid_uniform") {
        if (!items.length) {
          return (
            <div>
              {galleryHeader}
              {emptyState}
            </div>
          );
        }
        const gridClass =
          items.length === 1 ? "gallery-grid-uniform max-w-md" : "gallery-grid-uniform";
        const wrapStyle = items.length === 1 ? { maxWidth: 420 } : undefined;
        return (
          <div>
            {galleryHeader}
            <div data-editor-field-path="items" className={gridClass} style={wrapStyle}>
              {items.map((item, index) => (
                <div key={index} className="flex flex-col">
                  <div data-editor-field-path={`items[${index}].photo`}>
                    {item.image
                      ? imageBox(item.image, "4/3", 8)
                      : placeholderBox(`p-${index}`, "4/3", 8)}
                  </div>
                  {item.title || item.description ? (
                    <div
                      style={{
                        marginTop: 12,
                        fontSize: 13,
                        lineHeight: 1.55,
                        opacity: 0.7,
                      }}
                    >
                      {item.title ? (
                        <strong
                          data-editor-field-path={`items[${index}].title`}
                          style={{
                            fontWeight: 600,
                            display: "block",
                            marginBottom: 2,
                            fontSize: 14,
                            opacity: 1,
                          }}
                        >
                          {item.title}
                        </strong>
                      ) : null}
                      {item.description ? (
                        <span data-editor-field-path={`items[${index}].description`}>
                          {item.description}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (variant === "masonry") {
        if (!items.length) {
          return (
            <div>
              {galleryHeader}
              {emptyState}
            </div>
          );
        }
        const ratios = ["4/5", "1/1", "3/4", "1/1", "4/5", "3/4", "1/1", "4/5"];
        const colClass =
          items.length === 1
            ? "columns-1"
            : items.length === 2
              ? "columns-2"
              : "columns-2 md:columns-3";
        return (
          <div>
            {galleryHeader}
            <div data-editor-field-path="items" style={{ columnGap: 18 }} className={colClass}>
              {items.map((item, index) => (
                <div
                  key={index}
                  style={{
                    breakInside: "avoid",
                    marginBottom: 18,
                    display: "block",
                  }}
                >
                  <div data-editor-field-path={`items[${index}].photo`}>
                    {item.image
                      ? imageBox(item.image, ratios[index % ratios.length] ?? "4/5", 8)
                      : placeholderBox(`p-${index}`, ratios[index % ratios.length] ?? "4/5", 8)}
                  </div>
                  {item.title || item.description ? (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 12,
                        lineHeight: 1.55,
                        opacity: 0.7,
                        padding: "0 4px",
                      }}
                    >
                      {item.title ? (
                        <strong
                          data-editor-field-path={`items[${index}].title`}
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            opacity: 1,
                          }}
                        >
                          {item.title}
                        </strong>
                      ) : null}
                      {item.title && item.description ? <br /> : null}
                      {item.description ? (
                        <span data-editor-field-path={`items[${index}].description`}>
                          {item.description}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (variant === "mosaic_hero") {
        if (!items.length) {
          return (
            <div>
              {galleryHeader}
              {emptyState}
            </div>
          );
        }
        const hero = items[0] ?? null;
        const sides = items.slice(1, 3);
        const tiles = items.slice(3, 6);

        const heroBlock = hero?.image ? (
          <div
            data-editor-field-path="items[0].photo"
            className="col-span-2 row-span-2 md:col-span-4"
            style={{
              borderRadius: 12,
              overflow: "hidden",
              position: "relative",
              backgroundImage: `url(${hero.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              minHeight: 280,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "auto 0 0 0",
                padding: 24,
                background:
                  "linear-gradient(180deg, transparent, color-mix(in srgb, var(--preview-secondary-color, #0b1b2b) 92%, transparent))",
                color: "#fff",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: ".2em",
                  textTransform: "uppercase",
                  color: "var(--preview-primary-color, #10b981)",
                  marginBottom: 8,
                }}
              >
                Destaque
              </div>
              {hero.title ? (
                <div
                  data-editor-field-path="items[0].title"
                  style={{
                    fontWeight: 700,
                    fontSize: 22,
                    lineHeight: 1.2,
                    letterSpacing: "-0.02em",
                    marginBottom: 6,
                    maxWidth: "85%",
                  }}
                >
                  {hero.title}
                </div>
              ) : null}
              {hero.description ? (
                <div
                  data-editor-field-path="items[0].description"
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,.85)",
                    maxWidth: "75%",
                    lineHeight: 1.5,
                  }}
                >
                  {hero.description}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div
            data-editor-field-path="items[0].photo"
            className="col-span-2 row-span-2 md:col-span-4"
          >
            {placeholderBox("hero", "4/3", 12)}
          </div>
        );

        const renderSide = (item: (typeof items)[number], sideIndex: number, key: string) => {
          const itemIndex = sideIndex + 1;
          return (
            <div key={key} className="col-span-1 md:col-span-2">
              <div data-editor-field-path={`items[${itemIndex}].photo`}>
                {item.image
                  ? imageBox(item.image, "1/1", 12)
                  : placeholderBox(`${key}-ph`, "1/1", 12)}
              </div>
              {item.title || item.description ? (
                <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5, opacity: 0.7 }}>
                  {item.title ? (
                    <strong
                      data-editor-field-path={`items[${itemIndex}].title`}
                      style={{
                        display: "block",
                        fontWeight: 600,
                        marginBottom: 2,
                        fontSize: 13,
                        opacity: 1,
                      }}
                    >
                      {item.title}
                    </strong>
                  ) : null}
                  {item.description ? (
                    <span data-editor-field-path={`items[${itemIndex}].description`}>
                      {item.description}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        };

        return (
          <div>
            {galleryHeader}
            <div
              data-editor-field-path="items"
              className="grid grid-cols-2 md:grid-cols-6"
              style={{ gap: 14 }}
            >
              {heroBlock}
              {sides.map((s, i) => renderSide(s, i, `side-${i}`))}
              {tiles.length > 0 ? (
                <div
                  className={`col-span-2 grid md:col-span-6 ${
                    tiles.length === 1
                      ? "grid-cols-1"
                      : tiles.length === 2
                        ? "grid-cols-2 md:grid-cols-2"
                        : "grid-cols-2 md:grid-cols-3"
                  }`}
                  style={{ gap: 14 }}
                >
                  {tiles.map((tile, idx) => {
                    const tileItemIndex = idx + 3;
                    return (
                      <div
                        key={`tile-${idx}`}
                        data-editor-field-path={`items[${tileItemIndex}].photo`}
                      >
                        {tile.image
                          ? imageBox(tile.image, "4/3", 12)
                          : placeholderBox(`tile-${idx}`, "4/3", 12)}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        );
      }

      if (variant === "editorial") {
        if (!items.length) {
          return (
            <div>
              {galleryHeader}
              {emptyState}
            </div>
          );
        }
        return (
          <div>
            {galleryHeader}
            <div data-editor-field-path="items" className="flex flex-col" style={{ gap: 48 }}>
              {items.map((item, index) => {
                const reverse = index % 2 === 1;
                const noCaption = !item.title && !item.description;
                const num = String(index + 1).padStart(2, "0");
                const imageNode = (
                  <div
                    data-editor-field-path={`items[${index}].photo`}
                    style={{
                      aspectRatio: "4/3",
                      borderRadius: 12,
                      overflow: "hidden",
                      ...(item.image
                        ? {
                            backgroundImage: `url(${item.image})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : {
                            border: "1px dashed rgba(128,128,128,0.35)",
                            background:
                              "color-mix(in srgb, var(--preview-primary-color, #10b981) 6%, transparent)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "rgba(128,128,128,0.7)",
                            fontSize: 11,
                            letterSpacing: ".08em",
                            textTransform: "uppercase",
                            fontWeight: 600,
                          }),
                    }}
                  >
                    {!item.image ? "Imagem" : null}
                  </div>
                );
                const textNode = noCaption ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 24,
                      background:
                        "color-mix(in srgb, var(--preview-primary-color, #10b981) 7%, transparent)",
                      borderRadius: 12,
                      textAlign: "center",
                      minHeight: 100,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: ".22em",
                        textTransform: "uppercase",
                        opacity: 0.85,
                      }}
                    >
                      Projeto {num}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "8px 0" }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: ".22em",
                        textTransform: "uppercase",
                        color: "var(--preview-primary-color, #10b981)",
                        marginBottom: 14,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      Projeto {num}
                      <span
                        style={{
                          flex: 1,
                          height: 1,
                          background: "rgba(128,128,128,0.18)",
                        }}
                      />
                    </div>
                    {item.title ? (
                      <div
                        data-editor-field-path={`items[${index}].title`}
                        style={{
                          fontWeight: 700,
                          fontSize: 22,
                          lineHeight: 1.15,
                          letterSpacing: "-0.02em",
                          marginBottom: 10,
                        }}
                      >
                        {item.title}
                      </div>
                    ) : null}
                    {item.description ? (
                      <div
                        data-editor-field-path={`items[${index}].description`}
                        style={{
                          fontSize: 14,
                          lineHeight: 1.7,
                          opacity: 0.7,
                        }}
                      >
                        {item.description}
                      </div>
                    ) : null}
                  </div>
                );
                return (
                  <div
                    key={index}
                    className={`gallery-editorial-row ${reverse ? "is-reversed" : "is-normal"}`}
                  >
                    <div className={reverse ? "order-1 md:order-2" : "order-1"}>{imageNode}</div>
                    <div className={reverse ? "order-2 md:order-1" : "order-2"}>{textNode}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      if (!items.length) {
        return (
          <div>
            {galleryHeader}
            {emptyState}
          </div>
        );
      }
      const overlayGridClass =
        items.length === 1
          ? "grid grid-cols-1 gap-3"
          : items.length === 2
            ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
            : "grid grid-cols-2 gap-3 md:grid-cols-3";
      const overlayWrapStyle = items.length === 1 ? { maxWidth: 360 } : undefined;
      return (
        <div>
          {galleryHeader}
          <div data-editor-field-path="items" className={overlayGridClass} style={overlayWrapStyle}>
            {items.map((item, index) => {
              const num = String(index + 1).padStart(2, "0");
              return (
                <div
                  key={index}
                  data-editor-field-path={`items[${index}].photo`}
                  style={{
                    aspectRatio: "4/5",
                    borderRadius: 12,
                    overflow: "hidden",
                    position: "relative",
                    ...(item.image
                      ? {
                          backgroundImage: `url(${item.image})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : {
                          border: "1px dashed rgba(128,128,128,0.35)",
                          background:
                            "color-mix(in srgb, var(--preview-primary-color, #10b981) 6%, transparent)",
                        }),
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      background: "rgba(255,255,255,0.92)",
                      backdropFilter: "blur(8px)",
                      color: "var(--preview-secondary-color, #0b1b2b)",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: ".12em",
                      padding: "4px 9px",
                      borderRadius: 4,
                      zIndex: 2,
                    }}
                  >
                    {num}
                  </div>
                  {!item.image ? (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "rgba(128,128,128,0.7)",
                        fontSize: 11,
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      Imagem
                    </div>
                  ) : null}
                  {item.title || item.description ? (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: "48px 14px 14px",
                        background:
                          "linear-gradient(180deg, transparent, color-mix(in srgb, var(--preview-secondary-color, #0b1b2b) 92%, transparent))",
                        color: "#fff",
                      }}
                    >
                      {item.title ? (
                        <strong
                          data-editor-field-path={`items[${index}].title`}
                          style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 4,
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {item.title}
                        </strong>
                      ) : null}
                      {item.description ? (
                        <span
                          data-editor-field-path={`items[${index}].description`}
                          style={{
                            fontSize: 12,
                            color: "rgba(255,255,255,.78)",
                            lineHeight: 1.5,
                          }}
                        >
                          {item.description}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    case "economy_purchases":
      return <EconomyPurchasesSection section={section} vars={vars} />;
    case "pricing": {
      const pricingLayout = resolveSectionVariantServerSafe("pricing", section.variant);
      const pricingBranding = brandingForPricingSection(
        options?.branding,
        section.fields as Record<string, unknown>
      );
      return (
        <PricingSectionPreview
          intro={
            <div data-editor-field-path="text" className="preview-editable-target">
              {renderRichText(f.text, vars)}
            </div>
          }
          showDiscount={Boolean(f.showDiscountRow)}
          paymentConditions={String(f.paymentConditions ?? "")}
          vars={vars}
          compact={pricingLayout === "compact"}
          branding={pricingBranding}
          paymentOptions={options?.paymentOptions}
          mode={options?.mode}
        />
      );
    }
    case "financing": {
      const investment = parseMoneyLikeServerSafe(
        vars.investimento_total ?? vars.investimento_com_desconto ?? 0,
        0
      );
      const monthlySavings = parseMoneyLikeServerSafe(vars.economia_mensal ?? 0, 0);

      let effectivePaymentOptions = options?.paymentOptions ?? vars.paymentOptions ?? null;
      if (!effectivePaymentOptions && vars.payment_options_json) {
        try {
          const parsed = JSON.parse(String(vars.payment_options_json));
          effectivePaymentOptions = normalizePaymentOptions(parsed, investment);
        } catch {
          // ignore
        }
      }
      if (!effectivePaymentOptions) {
        effectivePaymentOptions = normalizePaymentOptions(
          null,
          investment > 0 ? investment : 25000
        );
      }

      const sectionBranding = {
        primaryColor: options?.branding?.primaryColor,
        secondaryColor: options?.branding?.secondaryColor,
        textColor:
          (typeof f["textColor"] === "string" && f["textColor"].trim()) ||
          options?.branding?.textColor,
        backgroundColor:
          (typeof f["backgroundColor"] === "string" && f["backgroundColor"].trim()) ||
          options?.branding?.backgroundColor,
      };

      return (
        <ProposalPaymentCards
          paymentOptions={effectivePaymentOptions}
          monthlySavings={monthlySavings}
          mode={options?.mode}
          sectionTitle={f.title ? tpl(f.title, vars) : undefined}
          sectionDescription={f.text ? renderRichText(f.text, vars) : undefined}
          branding={sectionBranding}
        />
      );
    }
    case "testimonials":
      return (
        <TestimonialsSectionPreview
          section={section}
          vars={vars}
          branding={options?.branding}
          intro={
            <div data-editor-field-path="text" className="preview-editable-target">
              {renderRichText(f.text, vars)}
            </div>
          }
        />
      );
    case "social_proof":
    case "guarantees": {
      const items = asStringArray(f.items);
      return (
        <ul data-editor-field-path="items" className="list-disc space-y-1 pl-5">
          {(items.length ? items : ["Item 1", "Item 2"]).map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      );
    }
    case "process_steps": {
      const fields = section.fields as Record<string, unknown>;
      const stepsAlign = resolveSectionHorizontalAlignment(section);
      let steps = normalizeProcessSteps(fields["items"]);
      if (steps.length === 0) steps = demoProcessSteps();
      const layoutRaw = resolveSectionVariantServerSafe(
        "process_steps",
        String(section.variant ?? "vertical")
      );
      const layout =
        layoutRaw === "horizontal" ? "horizontal" : layoutRaw === "cards" ? "cards" : "vertical";
      const intro = renderRichText(fields["text"], vars);
      return (
        <div className="w-full min-w-0 space-y-4">
          {intro ? (
            <div data-editor-field-path="text" className="preview-editable-target">
              {intro}
            </div>
          ) : null}
          <div data-editor-field-path="items" className="preview-editable-target w-full min-w-0">
            <StepsSection
              steps={steps}
              layout={layout}
              align={stepsAlign}
              theme={brandingToStepsTheme(options?.branding)}
              getStepFieldPath={(index, stepField) => `items[${index}].${stepField}`}
            />
          </div>
        </div>
      );
    }
    case "faq": {
      const rawItems = asObjectArray<{ question?: unknown; answer?: unknown }>(f.items);
      const items = (
        rawItems.length
          ? rawItems
          : [{ question: "Pergunta exemplo?", answer: "Resposta exemplo." }]
      ).map((item) => ({
        question: tpl(item.question, vars),
        answerHtml: tpl(item.answer, vars),
      }));

      const faqVariant = (() => {
        const raw = String(section.variant ?? "")
          .trim()
          .toLowerCase();
        if (raw === "list" || raw === "two_column" || raw === "interview" || raw === "headline")
          return raw;
        if (raw === "accordion" || raw === "default" || raw === "simple") return "list";
        if (raw === "grid") return "two_column";
        if (raw === "editorial") return "interview";
        if (raw === "typographic") return "headline";
        return "list";
      })();

      const eyebrow = tpl(f.eyebrow ?? "", vars).trim();
      const titleText = tpl(f.title ?? "", vars).trim();
      const subtitleText = tpl(f.subtitle ?? "", vars).trim();
      const dividerColor = "color-mix(in srgb, currentColor 16%, transparent)";

      const header =
        eyebrow || titleText || (faqVariant === "interview" && subtitleText) ? (
          <header
            className="mb-9"
            style={{ paddingBottom: 20, borderBottom: `1px solid ${dividerColor}` }}
          >
            {eyebrow ? (
              <div
                data-editor-field-path="eyebrow"
                className="preview-editable-target mb-2.5 text-[11px] font-semibold uppercase tracking-[.22em]"
                style={{ color: "var(--preview-primary-color, currentColor)" }}
              >
                {eyebrow}
              </div>
            ) : null}
            {titleText ? (
              <h2
                data-editor-field-path="title"
                className="preview-editable-target text-[26px] font-bold leading-[1.15] tracking-[-0.025em] md:text-[30px]"
              >
                {titleText}
              </h2>
            ) : null}
            {faqVariant === "interview" && subtitleText ? (
              <p
                data-editor-field-path="subtitle"
                className="preview-editable-target mt-2 text-sm opacity-65"
                style={{ maxWidth: 540 }}
              >
                {subtitleText}
              </p>
            ) : null}
          </header>
        ) : null;

      const richAnswer = (html: string, fieldPath: string, className: string) =>
        html ? (
          <div
            data-editor-field-path={fieldPath}
            className={`preview-rich-content ${className}`.trim()}
            dangerouslySetInnerHTML={safeHtml(html)}
          />
        ) : null;

      if (faqVariant === "list") {
        return (
          <div>
            {header}
            <div data-editor-field-path="items" className="flex flex-col">
              {items.map((item, index) => (
                <div
                  key={`faq-${index}`}
                  className="border-b py-6 last:border-b-0"
                  style={{ borderColor: dividerColor }}
                >
                  <div className="mb-3 flex items-start gap-3.5">
                    <span
                      aria-hidden
                      className="shrink-0 rounded text-[12px] font-bold tracking-[.04em]"
                      style={{
                        color: "var(--preview-primary-color, currentColor)",
                        background:
                          "color-mix(in srgb, var(--preview-primary-color, currentColor) 12%, transparent)",
                        padding: "4px 8px",
                        marginTop: 2,
                      }}
                    >
                      P
                    </span>
                    <span
                      data-editor-field-path={`items[${index}].question`}
                      className="text-[17px] font-semibold leading-[1.4] tracking-[-0.015em] md:text-[18px]"
                    >
                      {item.question}
                    </span>
                  </div>
                  {richAnswer(
                    item.answerHtml,
                    `items[${index}].answer`,
                    "text-[15px] leading-[1.7] opacity-70"
                  )}
                  <style>{`[data-editor-field-path="items[${index}].answer"] { padding-left: 38px; }`}</style>
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (faqVariant === "two_column") {
        return (
          <div>
            {header}
            <div data-editor-field-path="items" className="faq-two-column-grid">
              {items.map((item, index) => (
                <div
                  key={`faq-${index}`}
                  className="border-b pb-6"
                  style={{ borderColor: dividerColor }}
                >
                  <div
                    data-editor-field-path={`items[${index}].question`}
                    className="mb-2.5 text-[15px] font-bold leading-[1.35] tracking-[-0.01em] md:text-[16px]"
                  >
                    <span
                      aria-hidden
                      className="mr-2 font-semibold"
                      style={{ color: "var(--preview-primary-color, currentColor)" }}
                    >
                      →
                    </span>
                    {item.question}
                  </div>
                  {richAnswer(
                    item.answerHtml,
                    `items[${index}].answer`,
                    "text-[14px] leading-[1.7] opacity-70"
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (faqVariant === "interview") {
        return (
          <div>
            {header}
            <div data-editor-field-path="items" className="flex flex-col" style={{ gap: 32 }}>
              {items.map((item, index) => {
                const num = String(index + 1).padStart(2, "0");
                return (
                  <div
                    key={`faq-${index}`}
                    className="faq-interview-row border-b pb-6 last:border-b-0 last:pb-0"
                    style={{ borderColor: dividerColor }}
                  >
                    <div className="md:text-right">
                      <div
                        className="text-[32px] font-extrabold leading-[0.9] tracking-[-0.04em] md:text-[44px]"
                        style={{ paddingTop: 4 }}
                      >
                        {num}
                      </div>
                      <span
                        aria-hidden
                        className="mt-3 block h-0.5 w-6 md:ml-auto"
                        style={{ background: "var(--preview-primary-color, currentColor)" }}
                      />
                    </div>
                    <div>
                      <h3
                        data-editor-field-path={`items[${index}].question`}
                        className="mb-3 text-[19px] font-bold leading-[1.25] tracking-[-0.02em] md:text-[22px]"
                        style={{ paddingTop: 4 }}
                      >
                        {item.question}
                      </h3>
                      {richAnswer(
                        item.answerHtml,
                        `items[${index}].answer`,
                        "text-[15px] leading-[1.75] opacity-70"
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      return (
        <div>
          {header}
          <div data-editor-field-path="items" className="flex flex-col">
            {items.map((item, index) => {
              const num = String(index + 1).padStart(2, "0");
              return (
                <div
                  key={`faq-${index}`}
                  className="faq-headline-row items-start border-t py-6 first:border-t-0 first:pt-0 last:pb-0"
                  style={{ borderColor: dividerColor }}
                >
                  <div className="flex flex-col gap-2.5">
                    <div
                      className="text-[11px] font-semibold uppercase tracking-[.22em]"
                      style={{ color: "var(--preview-primary-color, currentColor)" }}
                    >
                      Pergunta {num}
                    </div>
                    <h3
                      data-editor-field-path={`items[${index}].question`}
                      className="text-[22px] font-bold leading-[1.18] tracking-[-0.025em] md:text-[28px]"
                    >
                      {item.question}
                    </h3>
                  </div>
                  {richAnswer(
                    item.answerHtml,
                    `items[${index}].answer`,
                    "text-[15px] leading-[1.75] opacity-70"
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    case "cta": {
      const ctaFields = section.fields as Record<string, unknown>;
      const ctaBranding = options?.branding ?? {
        primaryColor: "#22c55e",
        secondaryColor: "#16a34a",
        textColor: "#e5e7eb",
        backgroundColor: "#0b1220",
      };
      const ctaTheme = buildDecisionCTATheme(ctaBranding, ctaFields["dangerColor"]);
      const proposalUrl = resolveProposalBaseUrl(ctaFields, vars);
      const ctaActions = resolveCtaActions(ctaFields);
      const ctaAlign = resolveSectionHorizontalAlignment(section);
      const legacyStyle = String(ctaFields["style"] ?? "").trim();
      const ctaVariant = resolveSectionVariantServerSafe(
        "cta",
        String(section.variant ?? "primary")
      );
      const ctaEmphasis =
        legacyStyle === "secondary" || ctaVariant === "secondary" ? "secondary" : "primary";
      const currentProposalId = String(
        vars["proposta_id"] ?? vars["proposalId"] ?? vars["id"] ?? ""
      ).trim();
      const currentClientName = String(vars["nome_cliente"] ?? "").trim();

      return (
        <DecisionCTASection
          intro={
            <div data-editor-field-path="text" className="preview-editable-target">
              {renderRichText(ctaFields["text"], vars)}
            </div>
          }
          proposalUrl={proposalUrl}
          actions={ctaActions}
          theme={ctaTheme}
          mode={renderMode}
          emphasis={ctaEmphasis}
          align={ctaAlign}
          proposalId={currentProposalId || undefined}
          clientName={currentClientName || undefined}
        />
      );
    }
    case "signature":
      return (
        <SignatureSectionPreview
          section={section}
          vars={vars}
          mode={renderMode}
          branding={options?.branding}
        />
      );
    case "comparison":
      return (
        <div className="space-y-3">
          <div data-editor-field-path="text" className="preview-editable-target">
            {renderRichText(f.text, vars)}
          </div>
          <div className="comparison-cards-grid">
            <div className="rounded-xl border border-zinc-700/70 p-3 sm:p-4">
              <p
                data-editor-field-path="beforeLabel"
                className="text-xs uppercase font-medium text-zinc-400"
              >
                {String(f.beforeLabel ?? "Antes")}
              </p>
              <p className="mt-1 text-base sm:text-lg font-semibold">{vars.comparacao_antes}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 sm:p-4">
              <p
                data-editor-field-path="afterLabel"
                className="text-xs uppercase font-medium text-emerald-300"
              >
                {String(f.afterLabel ?? "Depois")}
              </p>
              <p className="mt-1 text-base sm:text-lg font-semibold">{vars.comparacao_depois}</p>
            </div>
          </div>
        </div>
      );
    case "video": {
      const url = String(f.videoUrl ?? "");
      const embedUrl = toEmbedUrl(url);
      const variant = (() => {
        const raw = String(section.variant ?? "")
          .trim()
          .toLowerCase();
        if (
          raw === "hero" ||
          raw === "split" ||
          raw === "cinematic" ||
          raw === "dark" ||
          raw === "editorial"
        )
          return raw;
        if (raw === "embed" || raw === "default") return "hero";
        if (raw === "inline") return "split";
        return "hero";
      })();

      const eyebrow = tpl(f.eyebrow ?? "", vars).trim();
      const titleText = tpl(f.title ?? "", vars).trim();
      const descriptionHtml = tpl(f.description ?? "", vars).trim();

      const playerFrame = embedUrl ? (
        <iframe
          data-editor-field-path="videoUrl"
          src={embedUrl}
          title={titleText || "Vídeo da proposta"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            display: "block",
          }}
        />
      ) : (
        <div
          data-editor-field-path="videoUrl"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.7)",
            fontSize: 12,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            fontWeight: 600,
            textAlign: "center",
            padding: 16,
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--preview-secondary-color, #0b1b2b) 92%, transparent), color-mix(in srgb, var(--preview-primary-color, #10b981) 30%, transparent))",
          }}
        >
          Cole uma URL de YouTube ou Vimeo para exibir o vídeo
        </div>
      );

      const playerStage = (radius = 12, extraStyle?: CSSProperties) => (
        <div
          style={{
            position: "relative",
            aspectRatio: "16 / 9",
            borderRadius: radius,
            overflow: "hidden",
            backgroundColor: "#000",
            ...extraStyle,
          }}
        >
          {playerFrame}
        </div>
      );

      if (renderMode === "pdf") {
        return (
          <div className="space-y-2">
            {eyebrow ? (
              <p
                data-editor-field-path="eyebrow"
                className="preview-editable-target"
                style={{
                  fontSize: 11,
                  letterSpacing: ".22em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "var(--preview-primary-color, #10b981)",
                }}
              >
                {eyebrow}
              </p>
            ) : null}
            {titleText ? (
              <h3
                data-editor-field-path="title"
                style={{ fontWeight: 700, fontSize: 22, lineHeight: 1.2 }}
              >
                {titleText}
              </h3>
            ) : null}
            <div data-editor-field-path="description" className="preview-editable-target">
              {renderRichText(descriptionHtml, vars)}
            </div>
            <p style={{ fontSize: 13, opacity: 0.6 }}>Vídeo: {url || "(sem URL)"}</p>
          </div>
        );
      }

      if (variant === "hero") {
        return (
          <div style={{ maxWidth: 920, marginLeft: "auto", marginRight: "auto" }}>
            {eyebrow ? (
              <div
                data-editor-field-path="eyebrow"
                className="preview-editable-target"
                style={{
                  fontSize: 11,
                  letterSpacing: ".22em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "var(--preview-primary-color, #10b981)",
                  marginBottom: 14,
                  textAlign: "center",
                }}
              >
                {eyebrow}
              </div>
            ) : null}
            {titleText ? (
              <h3
                data-editor-field-path="title"
                className="preview-editable-target"
                style={{
                  fontWeight: 700,
                  fontSize: 36,
                  lineHeight: 1.12,
                  letterSpacing: "-0.03em",
                  textAlign: "center",
                  marginBottom: 28,
                  maxWidth: 720,
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                {titleText}
              </h3>
            ) : null}
            <div style={{ marginBottom: descriptionHtml ? 28 : 0 }}>{playerStage()}</div>
            {descriptionHtml ? (
              <div
                data-editor-field-path="description"
                className="preview-editable-target"
                style={{
                  fontSize: 15,
                  lineHeight: 1.7,
                  opacity: 0.7,
                  textAlign: "center",
                  maxWidth: 640,
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                {renderRichText(descriptionHtml, vars)}
              </div>
            ) : null}
          </div>
        );
      }

      if (variant === "split") {
        return (
          <div className="video-split-grid items-center">
            <div style={{ padding: "8px 0" }}>
              {eyebrow ? (
                <div
                  data-editor-field-path="eyebrow"
                  className="preview-editable-target"
                  style={{
                    fontSize: 11,
                    letterSpacing: ".22em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    color: "var(--preview-primary-color, #10b981)",
                    marginBottom: 14,
                  }}
                >
                  {eyebrow}
                </div>
              ) : null}
              {titleText ? (
                <h3
                  data-editor-field-path="title"
                  className="preview-editable-target"
                  style={{
                    fontWeight: 700,
                    fontSize: 30,
                    lineHeight: 1.15,
                    letterSpacing: "-0.025em",
                    marginBottom: 18,
                  }}
                >
                  {titleText}
                </h3>
              ) : null}
              {descriptionHtml ? (
                <div
                  data-editor-field-path="description"
                  className="preview-editable-target"
                  style={{ fontSize: 15, lineHeight: 1.75, opacity: 0.7 }}
                >
                  {renderRichText(descriptionHtml, vars)}
                </div>
              ) : null}
            </div>
            <div>{playerStage()}</div>
          </div>
        );
      }

      if (variant === "cinematic") {
        return (
          <div
            style={{
              background:
                "color-mix(in srgb, var(--preview-primary-color, #10b981) 6%, transparent)",
              borderRadius: 16,
              padding: "40px 32px 80px",
              position: "relative",
            }}
          >
            <div style={{ marginBottom: 28 }}>
              {eyebrow ? (
                <div
                  data-editor-field-path="eyebrow"
                  className="preview-editable-target"
                  style={{
                    fontSize: 11,
                    letterSpacing: ".22em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    color: "var(--preview-primary-color, #10b981)",
                    marginBottom: 10,
                  }}
                >
                  {eyebrow}
                </div>
              ) : null}
              {titleText ? (
                <h3
                  data-editor-field-path="title"
                  className="preview-editable-target"
                  style={{
                    fontWeight: 700,
                    fontSize: 30,
                    lineHeight: 1.12,
                    letterSpacing: "-0.025em",
                    maxWidth: 620,
                  }}
                >
                  {titleText}
                </h3>
              ) : null}
            </div>
            <div style={{ position: "relative", marginBottom: descriptionHtml ? -56 : 0 }}>
              {playerStage()}
              {descriptionHtml ? (
                <div
                  data-editor-field-path="description"
                  className="preview-editable-target"
                  style={{
                    background: "#fff",
                    color: "#1a1a1a",
                    borderRadius: 12,
                    padding: "20px 24px",
                    width: "min(640px, 90%)",
                    margin: "-56px auto 0",
                    position: "relative",
                    zIndex: 2,
                    boxShadow: "0 24px 48px -16px rgba(11,27,43,.18)",
                    border: "1px solid rgba(128,128,128,0.18)",
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  {renderRichText(descriptionHtml, vars)}
                </div>
              ) : null}
            </div>
          </div>
        );
      }

      if (variant === "dark") {
        return (
          <div
            style={{
              background: "rgb(var(--preview-background-rgb, 11 27 43))",
              color: "inherit",
              borderRadius: 16,
              padding: "48px 32px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: -200,
                right: -200,
                width: 600,
                height: 600,
                background:
                  "radial-gradient(circle, var(--preview-primary-color, #10b981) 0%, transparent 60%)",
                opacity: 0.18,
                filter: "blur(40px)",
                pointerEvents: "none",
              }}
            />
            <div style={{ textAlign: "center", marginBottom: 32, position: "relative", zIndex: 2 }}>
              {eyebrow ? (
                <div
                  data-editor-field-path="eyebrow"
                  className="preview-editable-target"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 11,
                    letterSpacing: ".22em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    color: "var(--preview-primary-color, #10b981)",
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 1,
                      background: "var(--preview-primary-color, #10b981)",
                    }}
                  />
                  {eyebrow}
                  <span
                    style={{
                      width: 24,
                      height: 1,
                      background: "var(--preview-primary-color, #10b981)",
                    }}
                  />
                </div>
              ) : null}
              {titleText ? (
                <h3
                  data-editor-field-path="title"
                  className="preview-editable-target"
                  style={{
                    fontWeight: 700,
                    fontSize: 32,
                    lineHeight: 1.12,
                    letterSpacing: "-0.03em",
                    maxWidth: 720,
                    marginLeft: "auto",
                    marginRight: "auto",
                  }}
                >
                  {titleText}
                </h3>
              ) : null}
            </div>
            <div
              style={{
                position: "relative",
                zIndex: 2,
                maxWidth: 920,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {playerStage(12, { boxShadow: "0 32px 64px -16px rgba(0,0,0,.5)" })}
            </div>
            {descriptionHtml ? (
              <div
                data-editor-field-path="description"
                className="preview-editable-target"
                style={{
                  marginTop: 28,
                  textAlign: "center",
                  fontSize: 15,
                  lineHeight: 1.7,
                  opacity: 0.78,
                  maxWidth: 640,
                  marginLeft: "auto",
                  marginRight: "auto",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                {renderRichText(descriptionHtml, vars)}
              </div>
            ) : null}
          </div>
        );
      }

      return (
        <div>
          {eyebrow ? (
            <div className="flex items-center" style={{ gap: 14, marginBottom: 14 }}>
              <div
                data-editor-field-path="eyebrow"
                className="preview-editable-target"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".22em",
                  textTransform: "uppercase",
                  color: "var(--preview-primary-color, #10b981)",
                }}
              >
                {eyebrow}
              </div>
              <div
                style={{ flex: 1, height: 1, background: "rgba(128,128,128,0.2)" }}
                aria-hidden
              />
            </div>
          ) : null}
          {titleText ? (
            <h3
              data-editor-field-path="title"
              className="preview-editable-target"
              style={{
                fontWeight: 700,
                fontSize: 36,
                lineHeight: 1.1,
                letterSpacing: "-0.035em",
                maxWidth: 820,
                marginBottom: 28,
              }}
            >
              {titleText}
            </h3>
          ) : null}
          <div style={{ marginBottom: descriptionHtml ? 28 : 0 }}>{playerStage()}</div>
          {descriptionHtml ? (
            <div
              className="video-editorial-meta-grid"
              style={{
                paddingTop: 24,
                borderTop: "1px solid rgba(128,128,128,0.18)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: ".22em",
                  textTransform: "uppercase",
                  color: "var(--preview-primary-color, #10b981)",
                  paddingTop: 4,
                }}
              >
                Sobre o vídeo
              </div>
              <div
                data-editor-field-path="description"
                className="preview-editable-target"
                style={{ fontSize: 15, lineHeight: 1.7, maxWidth: 720 }}
              >
                {renderRichText(descriptionHtml, vars)}
              </div>
            </div>
          ) : null}
        </div>
      );
    }
    default:
      return (
        <div
          className="preview-rich-content max-w-none"
          dangerouslySetInnerHTML={safeHtml(
            replaceVariablesServerSafe(section.content, vars as unknown as Record<string, string>)
          )}
        />
      );
  }
}
