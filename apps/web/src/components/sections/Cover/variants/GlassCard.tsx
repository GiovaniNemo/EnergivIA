"use client";

import type { ReactNode } from "react";
import type { CoverContent, CoverStyle, CoverTypographySizes } from "../cover-utils";

interface GlassCardProps {
  content: CoverContent;
  style: Required<CoverStyle>;
  typography: CoverTypographySizes;
  topBranding?: ReactNode;
  contentBranding?: ReactNode;
  footerBranding?: ReactNode;
  primaryColor?: string;
}

export function GlassCard({
  content,
  style,
  typography,
  topBranding,
  footerBranding,
  primaryColor = "#22c55e",
}: GlassCardProps): React.JSX.Element {
  const minHeightPx = Math.round(250 * (style.coverHeight / 100));
  const hasBg = Boolean(style.backgroundImage);

  const pills = [
    { value: content.potenciaKwp, unit: "kWp" },
    { value: content.geracaoMensal, unit: "kWh/mês" },
    { value: content.coberturaConsumo, unit: "cobertura" },
    { value: content.equivalenteArvores, unit: "árv./ano" },
  ].filter((p) => p.value?.trim());

  return (
    <section
      className="relative flex flex-col overflow-hidden"
      style={{
        minHeight: minHeightPx,
        backgroundColor: style.backgroundColor,
        ...(hasBg
          ? {
              backgroundImage: `url(${style.backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
      }}
    >
      {}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(135deg, rgba(0,0,0,0.30), rgba(0,0,0,0.05))",
        }}
      />
      {}
      {style.overlayColor ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: style.overlayColor, opacity: style.overlayOpacity }}
        />
      ) : null}

      {}
      <div className="relative z-10 flex items-start justify-between p-6 md:p-8">
        {topBranding ?? null}
        <div className="rounded-full border border-white/25 bg-white/18 px-3 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
          Proposta
        </div>
      </div>

      {}
      <div
        className="relative z-10 m-4 mt-auto rounded-2xl border border-white/50 p-5 md:m-6 md:p-9"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          color: "#1a1a1a",
          boxShadow: "0 32px 64px -24px rgba(11,27,43,0.4)",
        }}
      >
        <p
          className="mb-2 text-[10px] font-semibold uppercase tracking-[.22em]"
          style={{ color: primaryColor }}
        >
          Solução sustentável
        </p>

        {content.title ? (
          <h2
            data-editor-field-path="title"
            className="font-bold leading-tight tracking-tight"
            style={{ fontSize: Math.round(typography.titleSize * 0.88), color: "#1a1a1a" }}
          >
            {content.title}
          </h2>
        ) : null}

        {content.subtitle ? (
          <div
            data-editor-field-path="subtitle"
            className="mt-2 text-sm leading-relaxed"
            style={{ color: "#5c6776" }}
            dangerouslySetInnerHTML={{ __html: content.subtitle }}
          />
        ) : null}

        {}
        {pills.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-black/[0.08] pt-4">
            {pills.map((p) => (
              <div
                key={p.unit}
                className="inline-flex items-baseline gap-1.5 rounded-full border border-black/10 bg-white/60 px-3 py-1.5"
              >
                <strong className="text-sm font-bold text-[#1a1a1a]">{p.value}</strong>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5c6776]">
                  {p.unit}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {}
      {footerBranding ? (
        <div className="relative z-10 px-4 pb-4 md:px-6">{footerBranding}</div>
      ) : null}
    </section>
  );
}
