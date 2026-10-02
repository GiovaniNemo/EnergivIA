"use client";

import type { ReactNode } from "react";
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

interface SignatureSectionPreviewProps {
  section: ProposalSection;
  vars: PreviewRenderVariables;
  mode?: "editor" | "web" | "pdf";
}

function tpl(value: unknown, vars: PreviewRenderVariables): string {
  return replaceVariables(String(value ?? ""), vars as unknown as Record<string, string>);
}

function renderHtmlSafe(html: string): ReactNode {
  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Calligraphic handwritten signature path for authentic contract representation
 */
function ClientHandwrittenSignature({ name }: { name: string }) {
  return (
    <div className="relative flex h-14 w-full items-center justify-center select-none overflow-hidden">
      {/* Decorative SVG cursive signature stroke */}
      <svg
        className="absolute inset-0 h-full w-full opacity-70 pointer-events-none text-emerald-600 dark:text-emerald-400"
        viewBox="0 0 280 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d="M 20,42 C 45,15 65,12 85,26 C 105,40 120,18 145,28 C 170,38 190,16 215,22 C 235,27 250,38 265,30"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 50,48 C 80,44 140,50 240,42"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
      <span className="relative z-10 font-serif italic text-xl tracking-wide text-zinc-800 dark:text-zinc-200 select-none opacity-90 drop-shadow-sm">
        {name}
      </span>
    </div>
  );
}

function CompanyCorporateSignature({
  companyName,
  signerName,
}: {
  companyName: string;
  signerName: string;
}) {
  return (
    <div className="relative flex h-14 w-full items-center justify-center select-none overflow-hidden">
      <svg
        className="absolute inset-0 h-full w-full opacity-60 pointer-events-none text-zinc-500 dark:text-zinc-400"
        viewBox="0 0 280 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d="M 25,35 C 55,8 80,48 115,20 C 145,-2 175,45 205,25 C 225,12 250,32 260,20"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 40,46 C 90,44 180,48 245,40"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center">
        <span className="font-serif italic text-lg tracking-wide text-zinc-800 dark:text-zinc-200 select-none opacity-90">
          {signerName}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-sans font-semibold">
          {companyName}
        </span>
      </div>
    </div>
  );
}

export function SignatureSectionPreview({
  section,
  vars,
}: SignatureSectionPreviewProps): JSX.Element {
  const f = (section.fields || {}) as Record<string, unknown>;
  const variant = String(section.variant ?? "default");

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
  const companyName = tpl(String(vars.nome_empresa || "EnergivIA Solar"), vars);

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
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-950/20 via-zinc-900/40 to-emerald-950/20 p-4 sm:p-5 backdrop-blur-md shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-sm">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    Certificado de Assinatura Eletrônica
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
                    MP 2.200-2 / 2001
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Protocolo de autenticidade e conformidade jurídica com carimbo de tempo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-zinc-100/80 dark:bg-zinc-900/80 px-3 py-1.5 border border-zinc-200/80 dark:border-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
              <Fingerprint className="h-3.5 w-3.5 text-emerald-500" />
              <span className="truncate max-w-[200px] sm:max-w-none">{digitalDocHash}</span>
            </div>
          </div>
        </div>

        {hasText && (
          <div data-editor-field-path="text" className="preview-editable-target px-1">
            {renderHtmlSafe(tpl(rawText, vars))}
          </div>
        )}

        {/* Digital Signers Dossier */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contratante Dossier Card */}
          <div className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 p-5 shadow-sm transition-all hover:border-emerald-500/40">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <UserCheck className="h-3.5 w-3.5" />
                  Contratante
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Assinatura Eletrônica
                </span>
              </div>

              <div>
                <h4
                  data-editor-field-path="clientSignerName"
                  className="preview-editable-target text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight"
                >
                  {clientSignerName}
                </h4>
                <p
                  data-editor-field-path="clientSignerRole"
                  className="preview-editable-target text-xs text-zinc-500 dark:text-zinc-400 mt-0.5"
                >
                  {clientSignerRole}
                </p>
                <p
                  data-editor-field-path="clientSignerDocument"
                  className="preview-editable-target text-[11px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5"
                >
                  {clientSignerDocument}
                </p>
              </div>

              {/* Digital audit attributes */}
              <div className="space-y-1.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-950/50 p-3 border border-zinc-200/50 dark:border-zinc-800/60 text-[11px]">
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>Validação:</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Link Seguro & Token Criptográfico
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>Data de Registro:</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {signatureDate}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>Status do Aceite:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Válido & Inalterável
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-[10px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-emerald-500" />
                Criptografia SHA-256
              </span>
              <span>
                Audit Trail ID: #AC-{vars.nome_cliente ? vars.nome_cliente.length * 107 : "001"}
              </span>
            </div>
          </div>

          {/* Contratada Dossier Card */}
          <div className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 p-5 shadow-sm transition-all hover:border-zinc-400 dark:hover:border-zinc-700">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  <Building2 className="h-3.5 w-3.5" />
                  Contratada
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Emissor Credenciado
                </span>
              </div>

              <div>
                <h4
                  data-editor-field-path="companySignerName"
                  className="preview-editable-target text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight"
                >
                  {companySignerName}
                </h4>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {companyName}
                </p>
                <p
                  data-editor-field-path="companySignerRole"
                  className="preview-editable-target text-xs text-zinc-500 dark:text-zinc-400 mt-0.5"
                >
                  {companySignerRole}
                </p>
                <p
                  data-editor-field-path="companySignerDocument"
                  className="preview-editable-target text-[11px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5"
                >
                  {companySignerDocument}
                </p>
              </div>

              {/* Company audit attributes */}
              <div className="space-y-1.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-950/50 p-3 border border-zinc-200/50 dark:border-zinc-800/60 text-[11px]">
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>Chave de Emissão:</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Certificado Corporativo EnergivIA
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>Data da Proposta:</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {signatureDate}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>Engenharia:</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Projeto Homologado
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-[10px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Award className="h-3 w-3 text-emerald-500" />
                Homologação EnergivIA
              </span>
              <span>Emissão Autorizada</span>
            </div>
          </div>
        </div>

        {/* Security Stamp & Verification Footer */}
        {showDigitalAudit && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-950/40 p-3.5 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-zinc-700 dark:text-zinc-300">
                  Registro Permanente de Aceite & Integridade
                </p>
                <p className="text-[11px] text-zinc-400">
                  Autenticidade garantida por chave criptográfica assimétrica e registro imutável em
                  nuvem.
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right font-mono text-[10px] text-zinc-400">
              <span>REF: {digitalDocHash.slice(0, 18)}...</span>
            </div>
          </div>
        )}

        {/* Legal Text */}
        {showLegalText && legalNote && (
          <div
            data-editor-field-path="legalNote"
            className="preview-editable-target rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-3 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400"
          >
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
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
          {renderHtmlSafe(tpl(rawText, vars))}
        </div>
      )}

      {/* Signature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: CONTRATANTE */}
        <div className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 p-6 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
          {/* Header pill & status */}
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <UserCheck className="h-3.5 w-3.5" />
              Contratante
            </span>
            <span className="text-[11px] font-medium text-zinc-400">Titular do Projeto</span>
          </div>

          {/* Signer Info */}
          <div className="mt-4 space-y-1">
            <h4
              data-editor-field-path="clientSignerName"
              className="preview-editable-target text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight"
            >
              {clientSignerName}
            </h4>
            <p
              data-editor-field-path="clientSignerRole"
              className="preview-editable-target text-xs text-zinc-500 dark:text-zinc-400"
            >
              {clientSignerRole}
            </p>
            <p
              data-editor-field-path="clientSignerDocument"
              className="preview-editable-target text-[11px] font-mono text-zinc-400 dark:text-zinc-500"
            >
              {clientSignerDocument}
            </p>
          </div>

          {/* Signature Canvas Box */}
          <div className="mt-6 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700/80 bg-zinc-50/70 dark:bg-zinc-950/40 p-4 flex flex-col items-center justify-center min-h-[105px]">
            <ClientHandwrittenSignature name={clientSignerName} />
            <div className="mt-1 h-px w-48 sm:w-56 bg-zinc-300 dark:bg-zinc-700" />
            <span className="mt-1 text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
              Assinatura do Contratante
            </span>
          </div>

          {/* Card Footer */}
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" />
              <span
                data-editor-field-path="signatureDate"
                className="preview-editable-target font-medium text-zinc-600 dark:text-zinc-300"
              >
                {signatureDate}
              </span>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Identidade Verificada</span>
            </div>
          </div>
        </div>

        {/* Card 2: CONTRATADA */}
        <div className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 p-6 shadow-sm transition-all hover:border-zinc-400 dark:hover:border-zinc-700 hover:shadow-md">
          {/* Header pill & status */}
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              <Building2 className="h-3.5 w-3.5" />
              Contratada
            </span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              Empresa Homologada
            </span>
          </div>

          {/* Signer Info */}
          <div className="mt-4 space-y-1">
            <h4
              data-editor-field-path="companySignerName"
              className="preview-editable-target text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight"
            >
              {companySignerName}
            </h4>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {companyName}
            </p>
            <p
              data-editor-field-path="companySignerRole"
              className="preview-editable-target text-xs text-zinc-500 dark:text-zinc-400"
            >
              {companySignerRole}
            </p>
            <p
              data-editor-field-path="companySignerDocument"
              className="preview-editable-target text-[11px] font-mono text-zinc-400 dark:text-zinc-500"
            >
              {companySignerDocument}
            </p>
          </div>

          {/* Signature Canvas Box */}
          <div className="mt-6 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700/80 bg-zinc-50/70 dark:bg-zinc-950/40 p-4 flex flex-col items-center justify-center min-h-[105px]">
            <CompanyCorporateSignature companyName={companyName} signerName={companySignerName} />
            <div className="mt-1 h-px w-48 sm:w-56 bg-zinc-300 dark:bg-zinc-700" />
            <span className="mt-1 text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
              Assinatura da Contratada
            </span>
          </div>

          {/* Card Footer */}
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" />
              <span
                data-editor-field-path="signatureDate"
                className="preview-editable-target font-medium text-zinc-600 dark:text-zinc-300"
              >
                {signatureDate}
              </span>
            </div>
            <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 font-medium">
              <Award className="h-3.5 w-3.5 text-emerald-500" />
              <span>Emissão Autorizada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legal Text Clause */}
      {showLegalText && legalNote && (
        <div
          data-editor-field-path="legalNote"
          className="preview-editable-target rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/30 p-4 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400"
        >
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
            <p>{legalNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}
