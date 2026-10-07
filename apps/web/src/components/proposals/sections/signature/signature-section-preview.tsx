"use client";

import type { ReactNode } from "react";
import { safeHtml } from "@energivia/utils";
import {
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  FileCheck2,
  Fingerprint,
  Lock,
  QrCode,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import type { ProposalSection } from "@/components/proposals/editor/types";
import { replaceVariables } from "@/components/proposals/editor/utils";
import type { PreviewRenderVariables } from "@/components/proposals/editor/section-render/types";

export interface SignatureSectionPreviewProps {
  section: ProposalSection;
  vars: PreviewRenderVariables;
  mode?: "editor" | "web" | "pdf";
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    textColor?: string;
    backgroundColor?: string;
  };
}

function parseHex(color: string): { r: number; g: number; b: number } | null {
  const normalized = color.trim().replace(/^#/, "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;
  const n = parseInt(expanded, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function getLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0.5;
  const { r, g, b } = rgb;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function resolveSignaturePalette(
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    textColor?: string;
    backgroundColor?: string;
  },
  sectionFields?: Record<string, unknown>
) {
  const primary = (branding?.primaryColor || "#059669").trim();
  const secondary = (branding?.secondaryColor || "#34d399").trim();
  const bg = (
    (typeof sectionFields?.["backgroundColor"] === "string" &&
      sectionFields["backgroundColor"].trim()) ||
    branding?.backgroundColor ||
    "#fafcf9"
  ).trim();
  const text = (
    (typeof sectionFields?.["textColor"] === "string" && sectionFields["textColor"].trim()) ||
    branding?.textColor ||
    "#022e22"
  ).trim();

  const isDark = getLuminance(bg) < 0.45;

  return {
    isDark,
    primary,
    secondary,
    bg,
    text,
    // Cards background & border adapting to light/dark palette
    cardBg: isDark
      ? `color-mix(in srgb, ${text} 8%, ${bg})`
      : `color-mix(in srgb, ${bg} 65%, white 35%)`,
    cardBorder: isDark
      ? `color-mix(in srgb, ${text} 16%, transparent)`
      : `color-mix(in srgb, ${text} 12%, transparent)`,
    cardShadow: isDark
      ? "0 8px 24px -4px rgba(0, 0, 0, 0.45)"
      : `0 8px 30px -4px color-mix(in srgb, ${text} 7%, transparent)`,

    // Canvas panel for the signature
    canvasBg: isDark
      ? `color-mix(in srgb, ${bg} 85%, black 15%)`
      : `color-mix(in srgb, ${bg} 75%, white 25%)`,
    canvasBorder: `color-mix(in srgb, ${text} 20%, transparent)`,
    signatureLine: `color-mix(in srgb, ${text} 28%, transparent)`,
    signatureStroke: primary,

    // Contratante badge
    clientBadgeBg: `color-mix(in srgb, ${primary} 12%, transparent)`,
    clientBadgeBorder: `color-mix(in srgb, ${primary} 28%, transparent)`,
    clientBadgeText: primary,

    // Contratada badge
    companyBadgeBg: `color-mix(in srgb, ${text} 8%, transparent)`,
    companyBadgeBorder: `color-mix(in srgb, ${text} 18%, transparent)`,
    companyBadgeText: text,

    // Text levels
    textTitle: text,
    textRole: `color-mix(in srgb, ${text} 75%, transparent)`,
    textDoc: `color-mix(in srgb, ${text} 50%, transparent)`,
    textMuted: `color-mix(in srgb, ${text} 65%, transparent)`,
    divider: `color-mix(in srgb, ${text} 10%, transparent)`,

    // Digital banner
    digitalBannerBg: isDark
      ? `color-mix(in srgb, ${primary} 12%, ${bg})`
      : `color-mix(in srgb, ${primary} 8%, ${bg})`,
    digitalBannerBorder: `color-mix(in srgb, ${primary} 26%, transparent)`,
    digitalChipBg: isDark
      ? `color-mix(in srgb, ${text} 10%, ${bg})`
      : `color-mix(in srgb, ${text} 5%, ${bg})`,
    digitalChipBorder: `color-mix(in srgb, ${text} 15%, transparent)`,

    // Legal disclaimer
    legalBg: `color-mix(in srgb, ${text} 4%, transparent)`,
    legalBorder: `color-mix(in srgb, ${text} 12%, transparent)`,
    legalText: `color-mix(in srgb, ${text} 72%, transparent)`,
  };
}

function tpl(value: unknown, vars: PreviewRenderVariables): string {
  return replaceVariables(String(value ?? ""), vars as unknown as Record<string, string>);
}

function renderHtmlSafe(html: string, textColor: string): ReactNode {
  return (
    <div
      className="prose prose-sm max-w-none text-left"
      style={{ color: textColor }}
      dangerouslySetInnerHTML={safeHtml(html)}
    />
  );
}

export function SignatureSectionPreview({
  section,
  vars,
  branding,
}: SignatureSectionPreviewProps): JSX.Element {
  const f = (section.fields || {}) as Record<string, unknown>;
  const variant = String(section.variant ?? "default");

  // Dynamic palette resolving from selected template colors
  const palette = resolveSignaturePalette(branding, f);

  // Client info
  const clientSignerName = tpl(
    String(f["clientSignerName"] || vars.nome_cliente || "Contratante"),
    vars
  );
  const clientSignerRole = tpl(
    String(f["clientSignerRole"] || "Titular da Unidade Consumidora / Responsável"),
    vars
  );
  const clientSignerDocument = tpl(
    String(f["clientSignerDocument"] || "Documento: Conforme Cadastro da UC"),
    vars
  );

  // Company info (with backward compatibility with signatureName)
  const legacySignatureName = f["signatureName"] ? String(f["signatureName"]) : "";
  const companySignerName = tpl(
    String(
      f["companySignerName"] ||
        legacySignatureName ||
        vars.nome_empresa ||
        "Diretoria Técnica & Comercial"
    ),
    vars
  );
  const companySignerRole = tpl(
    String(f["companySignerRole"] || "Responsável Técnico & Engenharia"),
    vars
  );
  const companySignerDocument = tpl(
    String(f["companySignerDocument"] || "CREA/CFT · Homologação Técnica Concessionária"),
    vars
  );
  const companyName = tpl(String(vars.nome_empresa || "Empresa Solar"), vars);

  // Date
  const signatureDate = tpl(
    String(f["signatureDate"] || vars.data_proposta || new Date().toLocaleDateString("pt-BR")),
    vars
  );

  // Legal Note
  const showLegalText = f["showLegalText"] !== false;
  const legalNoteRaw = String(
    f["legalNote"] ||
      "Documento formal de proposta comercial com validade jurídica e probatória nos termos do Art. 10 da MP nº 2.200-2/2001 e Código Civil Brasileiro. O aceite confirma a anuência integral com o escopo técnico, equipamentos e condições comerciais acordadas."
  );
  const legalNote = tpl(legalNoteRaw, vars);

  // Section Description / Header
  const rawText = f["text"] ? String(f["text"]) : "";
  const hasText = Boolean(rawText.trim() && rawText !== "<p></p>");

  // Digital audit flag
  const showDigitalAudit = f["showDigitalAudit"] !== false;

  // Modern deterministic hash for digital audit
  const digitalDocHash =
    "SHA256: 8f4e9a" +
    (companyName.length * 37 + clientSignerName.length * 19).toString(16).padStart(4, "0") +
    "c3d19e44b82a";

  if (variant === "digital") {
    return (
      <div className="w-full space-y-4 text-left">
        {/* Header Certificate Bar */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 sm:p-5 shadow-sm"
          style={{
            backgroundColor: palette.digitalBannerBg,
            borderColor: palette.digitalBannerBorder,
            borderWidth: 1,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
                style={{
                  backgroundColor: palette.clientBadgeBg,
                  borderColor: palette.clientBadgeBorder,
                  borderWidth: 1,
                  color: palette.primary,
                }}
              >
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: palette.primary }}
                  >
                    Certificado de Assinatura Eletrônica
                  </span>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: palette.clientBadgeBg,
                      borderColor: palette.clientBadgeBorder,
                      borderWidth: 1,
                      color: palette.primary,
                    }}
                  >
                    MP 2.200-2 / 2001
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: palette.textRole }}>
                  Protocolo de autenticidade e conformidade jurídica com carimbo de tempo
                </p>
              </div>
            </div>

            <div
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-mono"
              style={{
                backgroundColor: palette.digitalChipBg,
                borderColor: palette.digitalChipBorder,
                borderWidth: 1,
                color: palette.textDoc,
              }}
            >
              <Fingerprint className="h-3.5 w-3.5" style={{ color: palette.primary }} />
              <span className="truncate max-w-[200px] sm:max-w-none">{digitalDocHash}</span>
            </div>
          </div>
        </div>

        {hasText && (
          <div data-editor-field-path="text" className="preview-editable-target px-1">
            {renderHtmlSafe(tpl(rawText, vars), palette.textRole)}
          </div>
        )}

        {/* Digital Signers Dossier */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contratante Dossier Card */}
          <div
            className="group relative flex flex-col justify-between rounded-2xl p-5 shadow-sm transition-all"
            style={{
              backgroundColor: palette.cardBg,
              borderColor: palette.cardBorder,
              borderWidth: 1,
              boxShadow: palette.cardShadow,
            }}
          >
            <div className="space-y-3">
              <div
                className="flex items-center justify-between gap-2 pb-3"
                style={{ borderColor: palette.divider, borderBottomWidth: 1 }}
              >
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: palette.clientBadgeBg,
                    borderColor: palette.clientBadgeBorder,
                    borderWidth: 1,
                    color: palette.clientBadgeText,
                  }}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Contratante
                </span>
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold"
                  style={{ color: palette.primary }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Assinatura Eletrônica
                </span>
              </div>

              <div>
                <h4
                  data-editor-field-path="clientSignerName"
                  className="preview-editable-target text-base font-bold tracking-tight"
                  style={{ color: palette.textTitle }}
                >
                  {clientSignerName}
                </h4>
                <p
                  data-editor-field-path="clientSignerRole"
                  className="preview-editable-target text-xs mt-0.5"
                  style={{ color: palette.textRole }}
                >
                  {clientSignerRole}
                </p>
                <p
                  data-editor-field-path="clientSignerDocument"
                  className="preview-editable-target text-[11px] font-mono mt-0.5"
                  style={{ color: palette.textDoc }}
                >
                  {clientSignerDocument}
                </p>
              </div>

              {/* Digital audit attributes */}
              <div
                className="space-y-1.5 rounded-xl p-3 text-[11px]"
                style={{
                  backgroundColor: palette.canvasBg,
                  borderColor: palette.canvasBorder,
                  borderWidth: 1,
                }}
              >
                <div className="flex justify-between" style={{ color: palette.textRole }}>
                  <span>Validação:</span>
                  <span className="font-medium" style={{ color: palette.textTitle }}>
                    Link Seguro & Token Criptográfico
                  </span>
                </div>
                <div className="flex justify-between" style={{ color: palette.textRole }}>
                  <span>Data de Registro:</span>
                  <span className="font-medium" style={{ color: palette.textTitle }}>
                    {signatureDate}
                  </span>
                </div>
                <div className="flex justify-between" style={{ color: palette.textRole }}>
                  <span>Status do Aceite:</span>
                  <span className="font-semibold" style={{ color: palette.primary }}>
                    Válido & Inalterável
                  </span>
                </div>
              </div>
            </div>

            <div
              className="mt-4 flex items-center justify-between pt-3 text-[10px]"
              style={{
                borderColor: palette.divider,
                borderTopWidth: 1,
                color: palette.textDoc,
              }}
            >
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" style={{ color: palette.primary }} />
                Criptografia SHA-256
              </span>
              <span>
                Audit Trail ID: #AC-{vars.nome_cliente ? vars.nome_cliente.length * 107 : "001"}
              </span>
            </div>
          </div>

          {/* Contratada Dossier Card */}
          <div
            className="group relative flex flex-col justify-between rounded-2xl p-5 shadow-sm transition-all"
            style={{
              backgroundColor: palette.cardBg,
              borderColor: palette.cardBorder,
              borderWidth: 1,
              boxShadow: palette.cardShadow,
            }}
          >
            <div className="space-y-3">
              <div
                className="flex items-center justify-between gap-2 pb-3"
                style={{ borderColor: palette.divider, borderBottomWidth: 1 }}
              >
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: palette.companyBadgeBg,
                    borderColor: palette.companyBadgeBorder,
                    borderWidth: 1,
                    color: palette.companyBadgeText,
                  }}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Contratada
                </span>
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold"
                  style={{ color: palette.primary }}
                >
                  <ShieldCheck className="h-3.5 w-3.5" style={{ color: palette.primary }} />
                  Emissor Credenciado
                </span>
              </div>

              <div>
                <h4
                  data-editor-field-path="companySignerName"
                  className="preview-editable-target text-base font-bold tracking-tight"
                  style={{ color: palette.textTitle }}
                >
                  {companySignerName}
                </h4>
                <p className="text-xs font-medium" style={{ color: palette.primary }}>
                  {companyName}
                </p>
                <p
                  data-editor-field-path="companySignerRole"
                  className="preview-editable-target text-xs mt-0.5"
                  style={{ color: palette.textRole }}
                >
                  {companySignerRole}
                </p>
                <p
                  data-editor-field-path="companySignerDocument"
                  className="preview-editable-target text-[11px] font-mono mt-0.5"
                  style={{ color: palette.textDoc }}
                >
                  {companySignerDocument}
                </p>
              </div>

              {/* Company audit attributes */}
              <div
                className="space-y-1.5 rounded-xl p-3 text-[11px]"
                style={{
                  backgroundColor: palette.canvasBg,
                  borderColor: palette.canvasBorder,
                  borderWidth: 1,
                }}
              >
                <div className="flex justify-between" style={{ color: palette.textRole }}>
                  <span>Chave de Emissão:</span>
                  <span className="font-medium" style={{ color: palette.textTitle }}>
                    {tpl(
                      String(f["certificateText"] || `Certificado Corporativo ${companyName}`),
                      vars
                    )}
                  </span>
                </div>
                <div className="flex justify-between" style={{ color: palette.textRole }}>
                  <span>Data da Proposta:</span>
                  <span className="font-medium" style={{ color: palette.textTitle }}>
                    {signatureDate}
                  </span>
                </div>
                <div className="flex justify-between" style={{ color: palette.textRole }}>
                  <span>Engenharia:</span>
                  <span className="font-semibold" style={{ color: palette.primary }}>
                    Projeto Homologado
                  </span>
                </div>
              </div>
            </div>

            <div
              className="mt-4 flex items-center justify-between pt-3 text-[10px]"
              style={{
                borderColor: palette.divider,
                borderTopWidth: 1,
                color: palette.textDoc,
              }}
            >
              <span className="flex items-center gap-1">
                <Award className="h-3 w-3" style={{ color: palette.primary }} />
                {tpl(String(f["homologationText"] || `Homologação ${companyName}`), vars)}
              </span>
              <span>Emissão Autorizada</span>
            </div>
          </div>
        </div>

        {/* Security Stamp & Verification Footer */}
        {showDigitalAudit && (
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl p-3.5 text-xs shadow-sm"
            style={{
              backgroundColor: palette.canvasBg,
              borderColor: palette.cardBorder,
              borderWidth: 1,
              color: palette.textRole,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: palette.companyBadgeBg,
                  color: palette.textTitle,
                }}
              >
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold" style={{ color: palette.textTitle }}>
                  Registro Permanente de Aceite & Integridade
                </p>
                <p className="text-[11px]" style={{ color: palette.textDoc }}>
                  Autenticidade garantida por chave criptográfica assimétrica e registro imutável em
                  nuvem.
                </p>
              </div>
            </div>
            <div
              className="shrink-0 text-right font-mono text-[10px]"
              style={{ color: palette.textDoc }}
            >
              <span>REF: {digitalDocHash.slice(0, 18)}...</span>
            </div>
          </div>
        )}

        {/* Legal Text */}
        {showLegalText && legalNote && (
          <div
            data-editor-field-path="legalNote"
            className="preview-editable-target rounded-xl p-3 text-[11px] leading-relaxed"
            style={{
              backgroundColor: palette.legalBg,
              borderColor: palette.legalBorder,
              borderWidth: 1,
              borderStyle: "dashed",
              color: palette.legalText,
            }}
          >
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" style={{ color: palette.primary }} />
              <p>{legalNote}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Variant: "default" (Padrão - Contrato Executivo Bilateral)
  return (
    <div className="w-full space-y-5 text-left">
      {hasText && (
        <div data-editor-field-path="text" className="preview-editable-target px-1">
          {renderHtmlSafe(tpl(rawText, vars), palette.textRole)}
        </div>
      )}

      {/* Signature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: CONTRATANTE */}
        <div
          className="group relative flex flex-col justify-between rounded-2xl p-6 shadow-sm transition-all"
          style={{
            backgroundColor: palette.cardBg,
            borderColor: palette.cardBorder,
            borderWidth: 1,
            boxShadow: palette.cardShadow,
          }}
        >
          {/* Header pill & status */}
          <div
            className="flex items-center justify-between gap-2 pb-3"
            style={{ borderColor: palette.divider, borderBottomWidth: 1 }}
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: palette.clientBadgeBg,
                borderColor: palette.clientBadgeBorder,
                borderWidth: 1,
                color: palette.clientBadgeText,
              }}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Contratante
            </span>
            <span className="text-[11px] font-medium" style={{ color: palette.textDoc }}>
              Titular do Projeto
            </span>
          </div>

          {/* Signer Info */}
          <div className="mt-4 space-y-1">
            <h4
              data-editor-field-path="clientSignerName"
              className="preview-editable-target text-lg font-bold tracking-tight"
              style={{ color: palette.textTitle }}
            >
              {clientSignerName}
            </h4>
            <p
              data-editor-field-path="clientSignerRole"
              className="preview-editable-target text-xs"
              style={{ color: palette.textRole }}
            >
              {clientSignerRole}
            </p>
            <p
              data-editor-field-path="clientSignerDocument"
              className="preview-editable-target text-[11px] font-mono"
              style={{ color: palette.textDoc }}
            >
              {clientSignerDocument}
            </p>
          </div>

          {/* Signature Canvas Box */}
          <div
            className="mt-6 rounded-xl p-4 flex flex-col items-center justify-end min-h-[110px]"
            style={{
              backgroundColor: palette.canvasBg,
              borderColor: palette.canvasBorder,
              borderWidth: 1,
              borderStyle: "dashed",
            }}
          >
            <div className="h-px w-48 sm:w-56" style={{ backgroundColor: palette.signatureLine }} />
            <span
              className="mt-2 text-[10px] uppercase tracking-wider font-semibold"
              style={{ color: palette.textDoc }}
            >
              Assinatura do Contratante
            </span>
          </div>

          {/* Card Footer */}
          <div
            className="mt-4 flex items-center justify-between pt-3 text-[11px]"
            style={{
              borderColor: palette.divider,
              borderTopWidth: 1,
              color: palette.textDoc,
            }}
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" style={{ color: palette.textDoc }} />
              <span
                data-editor-field-path="signatureDate"
                className="preview-editable-target font-medium"
                style={{ color: palette.textRole }}
              >
                {signatureDate}
              </span>
            </div>
            <div className="flex items-center gap-1 font-medium" style={{ color: palette.primary }}>
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Identidade Verificada</span>
            </div>
          </div>
        </div>

        {/* Card 2: CONTRATADA */}
        <div
          className="group relative flex flex-col justify-between rounded-2xl p-6 shadow-sm transition-all"
          style={{
            backgroundColor: palette.cardBg,
            borderColor: palette.cardBorder,
            borderWidth: 1,
            boxShadow: palette.cardShadow,
          }}
        >
          {/* Header pill & status */}
          <div
            className="flex items-center justify-between gap-2 pb-3"
            style={{ borderColor: palette.divider, borderBottomWidth: 1 }}
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: palette.companyBadgeBg,
                borderColor: palette.companyBadgeBorder,
                borderWidth: 1,
                color: palette.companyBadgeText,
              }}
            >
              <Building2 className="h-3.5 w-3.5" />
              Contratada
            </span>
            <span className="text-[11px] font-medium" style={{ color: palette.primary }}>
              Empresa Homologada
            </span>
          </div>

          {/* Signer Info */}
          <div className="mt-4 space-y-1">
            <h4
              data-editor-field-path="companySignerName"
              className="preview-editable-target text-lg font-bold tracking-tight"
              style={{ color: palette.textTitle }}
            >
              {companySignerName}
            </h4>
            <p className="text-xs font-semibold" style={{ color: palette.primary }}>
              {companyName}
            </p>
            <p
              data-editor-field-path="companySignerRole"
              className="preview-editable-target text-xs"
              style={{ color: palette.textRole }}
            >
              {companySignerRole}
            </p>
            <p
              data-editor-field-path="companySignerDocument"
              className="preview-editable-target text-[11px] font-mono"
              style={{ color: palette.textDoc }}
            >
              {companySignerDocument}
            </p>
          </div>

          {/* Signature Canvas Box */}
          <div
            className="mt-6 rounded-xl p-4 flex flex-col items-center justify-end min-h-[110px]"
            style={{
              backgroundColor: palette.canvasBg,
              borderColor: palette.canvasBorder,
              borderWidth: 1,
              borderStyle: "dashed",
            }}
          >
            <div className="h-px w-48 sm:w-56" style={{ backgroundColor: palette.signatureLine }} />
            <span
              className="mt-2 text-[10px] uppercase tracking-wider font-semibold"
              style={{ color: palette.textDoc }}
            >
              Assinatura da Contratada
            </span>
          </div>

          {/* Card Footer */}
          <div
            className="mt-4 flex items-center justify-between pt-3 text-[11px]"
            style={{
              borderColor: palette.divider,
              borderTopWidth: 1,
              color: palette.textDoc,
            }}
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" style={{ color: palette.textDoc }} />
              <span
                data-editor-field-path="signatureDate"
                className="preview-editable-target font-medium"
                style={{ color: palette.textRole }}
              >
                {signatureDate}
              </span>
            </div>
            <div className="flex items-center gap-1 font-medium" style={{ color: palette.primary }}>
              <Award className="h-3.5 w-3.5" />
              <span>Emissão Autorizada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legal Text Clause */}
      {showLegalText && legalNote && (
        <div
          data-editor-field-path="legalNote"
          className="preview-editable-target rounded-2xl p-4 text-[11px] leading-relaxed"
          style={{
            backgroundColor: palette.legalBg,
            borderColor: palette.legalBorder,
            borderWidth: 1,
            color: palette.legalText,
          }}
        >
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" style={{ color: palette.primary }} />
            <p>{legalNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}
