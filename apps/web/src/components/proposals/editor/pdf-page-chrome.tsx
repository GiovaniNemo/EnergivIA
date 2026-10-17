"use client";

import type { CSSProperties, ReactNode } from "react";
import type { ProposalStyles } from "./types";
import type { PreviewRenderVariables } from "./section-render/types";
import { PdfOrbitalBackground } from "./pdf-orbital-background";
import { enforceHighContrastBranding } from "./pdf-contrast-utils";

interface PdfPageHeaderProps {
  pageNumber: number;
  totalPages: number;
  title: string;
  vars: PreviewRenderVariables;
  branding: ProposalStyles["branding"];
  typography: ProposalStyles["typography"];
}

interface PdfPageFooterProps {
  pageNumber: number;
  totalPages: number;
  vars: PreviewRenderVariables;
  branding: ProposalStyles["branding"];
}

interface PdfPageContainerProps {
  pageNumber: number;
  totalPages: number;
  isCover?: boolean;
  branding: ProposalStyles["branding"];
  children: ReactNode;
}

export function PdfPageHeader({ title, vars, branding }: PdfPageHeaderProps): JSX.Element {
  const safeBranding = enforceHighContrastBranding(branding);
  const companyName = String(vars.nome_empresa || "EnergivIA").trim();
  const clientName = String(vars.nome_cliente || "").trim();
  const logoUrl = safeBranding.logoUrl?.trim();
  const primaryColor = safeBranding.primaryColor;

  return (
    <header
      className="relative z-10 flex shrink-0 items-center justify-between border-b px-8 py-4 transition-colors"
      style={{
        borderColor: "color-mix(in srgb, currentColor 12%, transparent)",
        color: safeBranding.textColor,
      }}
    >
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={companyName}
            className="h-7 max-w-[140px] object-contain object-left"
          />
        ) : (
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: primaryColor }}
              aria-hidden
            />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
              {companyName}
            </span>
          </div>
        )}
      </div>

      <div className="text-right">
        <p className="text-[11px] font-medium tracking-tight opacity-80">
          {clientName ? `Proposta Comercial · ${clientName}` : title || "Proposta Solar"}
        </p>
        {vars.data_proposta ? (
          <p className="text-[9px] font-mono opacity-50">{vars.data_proposta}</p>
        ) : null}
      </div>
    </header>
  );
}

export function PdfPageFooter({
  pageNumber,
  totalPages,
  vars,
  branding,
}: PdfPageFooterProps): JSX.Element {
  const safeBranding = enforceHighContrastBranding(branding);
  const companyName = String(vars.nome_empresa || "EnergivIA").trim();

  return (
    <footer
      className="relative z-10 flex shrink-0 items-center justify-between border-t px-8 py-3 text-[10px] opacity-70"
      style={{
        borderColor: "color-mix(in srgb, currentColor 12%, transparent)",
        color: safeBranding.textColor,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">{companyName}</span>
        <span className="opacity-40">·</span>
        <span className="text-[9px] opacity-75">Documento Comercial Executivo</span>
      </div>

      <div className="flex items-center gap-1 font-mono text-[10px] font-medium tracking-wider">
        <span>Página {pageNumber}</span>
        <span className="opacity-40">/</span>
        <span>{totalPages}</span>
      </div>
    </footer>
  );
}

export function PdfPageContainer({
  pageNumber,
  totalPages,
  isCover = false,
  branding,
  children,
}: PdfPageContainerProps): JSX.Element {
  const safeBranding = enforceHighContrastBranding(branding);
  const style: CSSProperties = {
    backgroundColor: safeBranding.backgroundColor,
    color: safeBranding.textColor,
  };

  return (
    <div
      data-pdf-page={pageNumber}
      data-pdf-total-pages={totalPages}
      className={`proposal-pdf-page proposal-preview-cq relative mx-auto flex flex-col overflow-hidden text-left shadow-[0_8px_30px_rgba(0,0,0,0.22)] ring-1 ring-black/10 dark:ring-white/10 ${
        isCover ? "proposal-pdf-page--cover" : "proposal-pdf-page--content"
      }`}
      style={{
        ...style,
        width: "794px",
        height: "1123px",
        minHeight: "1123px",
        maxHeight: "1123px",
        aspectRatio: "210 / 297",
        boxSizing: "border-box",
        pageBreakAfter: pageNumber < totalPages ? "always" : "avoid",
        breakAfter: pageNumber < totalPages ? "page" : "avoid",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      {!isCover ? (
        <PdfOrbitalBackground primaryColor={safeBranding.primaryColor} variant="content" />
      ) : null}
      {children}
    </div>
  );
}
