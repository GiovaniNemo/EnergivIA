"use client";

import type { ReactNode } from "react";
import {
  safeHtml,
  type CoverContent,
  type CoverStyle,
  type CoverTypographySizes,
} from "../cover-utils";
import { PdfOrbitalBackground } from "@/components/proposals/editor/pdf-orbital-background";

interface EditorialPosterProps {
  content: CoverContent;
  style: Required<CoverStyle>;
  typography: CoverTypographySizes;
  topBranding?: ReactNode;
  contentBranding?: ReactNode;
  footerBranding?: ReactNode;
  primaryColor?: string;
}

export function EditorialPoster({
  content,
  style,
  typography,
  topBranding,
  footerBranding,
  primaryColor = "#22c55e",
}: EditorialPosterProps): React.JSX.Element {
  const minHeightPx = Math.round(250 * (style.coverHeight / 100));
  const titleFontSize = Math.min(72, Math.max(34, Math.round(typography.titleSize * 1.55)));

  const year = (() => {
    if (content.date) {
      const match = content.date.match(/\b(20\d\d)\b/);
      if (match) return match[1];
    }
    return String(new Date().getFullYear());
  })();

  const projectNumber = content.proposalNumber?.trim().replace(/^#/, "") || "4123";

  const stats = [
    { value: content.potenciaKwp, unit: "kWp", label: "Potência" },
    { value: content.geracaoMensal, unit: "kWh", label: "Geração/mês" },
  ].filter((s) => s.value?.trim());

  return (
    <section
      className="relative flex flex-col justify-between overflow-hidden h-full min-h-full flex-1 p-8 sm:p-10 md:p-12"
      style={{
        minHeight: minHeightPx,
        backgroundColor: style.backgroundColor,
        color: style.textColor,
      }}
    >
      {/* 1. Fundo Vetorial com Arcos Concêntricos Reativos */}
      <PdfOrbitalBackground primaryColor={primaryColor} variant="cover" />

      {/* Camada opcional de imagem customizada de fundo com overlay suave */}
      {style.backgroundImage ? (
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-15"
          style={{
            backgroundImage: `url(${style.backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : null}

      {/* 2. Topo: Ano com traço marcante à esquerda + Número do Projeto à direita */}
      <header className="relative z-10 flex items-start justify-between">
        <div className="flex flex-col items-start gap-2">
          {topBranding ? <div className="mb-2">{topBranding}</div> : null}
          <div className="text-4xl sm:text-5xl font-black tracking-tighter leading-none">
            {year}
          </div>
          <div
            className="h-1.5 w-12 rounded-full"
            style={{ backgroundColor: primaryColor }}
            aria-hidden="true"
          />
        </div>

        <div className="text-right">
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.25em]"
            style={{ color: style.textColor, opacity: 0.6 }}
          >
            PROJETO Nº
          </div>
          <div
            className="font-mono text-xs sm:text-sm font-bold tracking-wider mt-0.5"
            style={{ color: style.textColor }}
          >
            {projectNumber}
          </div>
        </div>
      </header>

      {/* 3. Centro (Foco Visual de Alto Impacto): Título Imponente e Subtítulo */}
      <div className="relative z-10 my-auto py-8">
        {content.highlight ? (
          <div
            className="mb-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: primaryColor }}
          >
            <span className="h-px w-5 inline-block" style={{ backgroundColor: primaryColor }} />
            {content.highlight}
          </div>
        ) : null}

        {content.title ? (
          <h1
            data-editor-field-path="title"
            className="font-black uppercase leading-[1.04] tracking-tight max-w-[92%]"
            style={{
              fontSize: titleFontSize,
              color: primaryColor,
              letterSpacing: "-0.035em",
            }}
          >
            {content.title}
          </h1>
        ) : null}

        {content.subtitle ? (
          <div
            data-editor-field-path="subtitle"
            className="mt-6 text-sm sm:text-base leading-relaxed max-w-[80%] font-light"
            style={{
              color: style.textColor,
              opacity: 0.78,
            }}
            dangerouslySetInnerHTML={safeHtml(content.subtitle)}
          />
        ) : null}

        {/* Pílulas técnicas discretas se houver métricas */}
        {stats.length > 0 ? (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs backdrop-blur-sm"
              >
                <span className="opacity-60 text-[10px] uppercase font-semibold">{s.label}:</span>
                <span className="font-bold text-white">
                  {s.value} <span style={{ color: primaryColor }}>{s.unit}</span>
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* 4. Base: Metadados Estruturados em 2 Colunas (Proposto a / Organizado por / Contato) */}
      <footer className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pt-4 border-t border-white/10">
        <div className="flex flex-col gap-4">
          <div>
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: style.textColor, opacity: 0.55 }}
            >
              PROPOSTO A:
            </div>
            <div
              data-editor-field-path="clientName"
              className="text-sm sm:text-base font-bold tracking-tight mt-0.5"
              style={{ color: style.textColor }}
            >
              {content.clientName || "Cliente"}
            </div>
          </div>

          <div>
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: style.textColor, opacity: 0.55 }}
            >
              ORGANIZADO POR:
            </div>
            <div
              data-editor-field-path="companyName"
              className="text-xs sm:text-sm font-semibold tracking-tight mt-0.5"
              style={{ color: primaryColor }}
            >
              {content.companyName || "Empresa Integradora"}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2 text-left sm:text-right">
          {footerBranding ? (
            <div>{footerBranding}</div>
          ) : content.showLogo && content.logo ? (
            <img
              src={content.logo}
              alt={content.companyName || "Logo"}
              className="max-h-11 max-w-[150px] object-contain object-left sm:object-right"
              style={{ height: "auto" }}
            />
          ) : null}

          <div
            className="h-1 w-10 rounded-full"
            style={{ backgroundColor: primaryColor }}
            aria-hidden="true"
          />

          <div
            className="text-[10px] font-medium uppercase tracking-[0.15em]"
            style={{ color: style.textColor, opacity: 0.65 }}
          >
            {content.companyCityState || "PROPOSTA SOLAR HOMOLOGADA"}
          </div>
        </div>
      </footer>
    </section>
  );
}
