"use client";

import type { ReactNode } from "react";
import type { CoverContent, CoverStyle, CoverTypographySizes } from "../cover-utils";

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
  const titleFontSize = Math.min(64, Math.max(32, Math.round(typography.titleSize * 1.5)));

  const stats = [
    { value: content.potenciaKwp, unit: "kWp", label: "Potência" },
    { value: content.geracaoMensal, unit: "kWh", label: "Geração mensal" },
    { value: content.coberturaConsumo, unit: "%", label: "Cobertura" },
    { value: content.equivalenteArvores, unit: "árv.", label: "Eq. árvores/ano" },
  ].filter((s) => s.value?.trim());

  return (
    <section
      className="relative flex flex-col"
      style={{
        minHeight: minHeightPx,
        backgroundColor: style.backgroundColor,
        color: style.textColor,
      }}
    >
      {}
      <div
        className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full"
        style={{
          background: `radial-gradient(circle, ${primaryColor}1a 0%, transparent 65%)`,
        }}
      />

      {}
      <div className="relative z-10 flex items-start justify-between px-8 pt-8 md:px-10 md:pt-10">
        {topBranding ?? null}
        {content.date ? (
          <div
            className="text-right text-[10px] font-semibold leading-relaxed uppercase tracking-[.2em]"
            style={{ color: style.textColor, opacity: 0.45 }}
          >
            {content.date}
          </div>
        ) : null}
      </div>

      {}
      <div className="relative z-10 mt-auto px-8 md:px-10">
        {}
        <p
          className="mb-6 text-[11px] font-semibold uppercase tracking-[.22em]"
          style={{ color: primaryColor }}
        >
          — Solução sustentável
        </p>

        {}
        {content.title ? (
          <h2
            data-editor-field-path="title"
            className="font-extrabold leading-none tracking-tight"
            style={{
              fontSize: titleFontSize,
              color: style.textColor,
              letterSpacing: "-0.045em",
              lineHeight: 0.98,
            }}
          >
            {content.title}
          </h2>
        ) : null}

        {}
        {content.subtitle ? (
          <div
            data-editor-field-path="subtitle"
            className="mb-10 mt-8 border-b pb-8 text-base leading-relaxed"
            style={{
              color: style.textColor,
              opacity: 0.65,
              maxWidth: "80%",
              borderColor: `${style.textColor}1f`,
            }}
            dangerouslySetInnerHTML={{ __html: content.subtitle }}
          />
        ) : (
          <div className="mb-10 mt-6" />
        )}
      </div>

      {}
      {stats.length > 0 ? (
        <div className="relative z-10 grid grid-cols-2 gap-5 px-8 pb-8 md:grid-cols-4 md:px-10 md:pb-10">
          {stats.map((s) => (
            <div key={s.label}>
              <div
                className="font-bold leading-tight tracking-tight"
                style={{ fontSize: 24, color: style.textColor, letterSpacing: "-0.025em" }}
              >
                {s.value}
                <span className="ml-1 text-sm font-medium" style={{ color: primaryColor }}>
                  {s.unit}
                </span>
              </div>
              <div
                className="mt-1.5 text-[10px] font-medium uppercase tracking-[.12em]"
                style={{ color: style.textColor, opacity: 0.5 }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="pb-8 md:pb-10" />
      )}

      {}
      {footerBranding ? (
        <div className="relative z-10 px-8 pb-6 md:px-10">{footerBranding}</div>
      ) : null}
    </section>
  );
}
