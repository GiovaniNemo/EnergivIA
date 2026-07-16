"use client";

import type { ReactNode } from "react";
import type { CoverContent, CoverStyle, CoverTypographySizes } from "../cover-utils";

interface SplitEditorialProps {
  content: CoverContent;
  style: Required<CoverStyle>;
  typography: CoverTypographySizes;
  topBranding?: ReactNode;
  contentBranding?: ReactNode;
  footerBranding?: ReactNode;
  primaryColor?: string;
}

export function SplitEditorial({
  content,
  style,
  typography,
  topBranding,
  footerBranding,
  primaryColor = "#22c55e",
}: SplitEditorialProps): React.JSX.Element {
  const minHeightPx = Math.round(250 * (style.coverHeight / 100));
  const hasBg = Boolean(style.backgroundImage);

  const stats = [
    { label: "Potência", value: content.potenciaKwp, unit: "kWp" },
    { label: "Geração mensal", value: content.geracaoMensal, unit: "kWh" },
    { label: "Cobertura", value: content.coberturaConsumo, unit: "%" },
    { label: "Eq. árvores/ano", value: content.equivalenteArvores, unit: "árv." },
  ].filter((s) => s.value?.trim());

  return (
    <section
      className="flex flex-col md:grid"
      style={{
        minHeight: minHeightPx,
        gridTemplateColumns: "55% 45%",
      }}
    >
      {}
      <div
        className="relative flex flex-col p-8 md:p-10"
        style={{ backgroundColor: style.backgroundColor, color: style.textColor }}
      >
        {}
        <div className="flex items-start justify-between">
          {topBranding ?? null}
          {content.date ? (
            <span
              className="text-[10px] font-semibold"
              style={{ color: style.textColor, opacity: 0.45 }}
            >
              {content.date}
            </span>
          ) : null}
        </div>

        {}
        <div className="mt-auto pt-8">
          {}
          <div
            className="mb-4 inline-block rounded px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
            style={{ background: `${primaryColor}18`, color: primaryColor }}
          >
            Energia Solar
          </div>

          {}
          {content.title ? (
            <h2
              data-editor-field-path="title"
              className="font-bold leading-tight tracking-tight"
              style={{ fontSize: typography.titleSize, color: style.textColor }}
            >
              {content.title}
            </h2>
          ) : null}

          {}
          {content.subtitle ? (
            <div
              data-editor-field-path="subtitle"
              className="mt-2 text-sm leading-relaxed"
              style={{ color: style.textColor, opacity: 0.65 }}
              dangerouslySetInnerHTML={{ __html: content.subtitle }}
            />
          ) : null}

          {}
          {stats.length > 0 ? (
            <div
              className="mt-6 grid gap-y-4 gap-x-6 border-t pt-6"
              style={{
                borderColor: "#E6E8EC",
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              {stats.map((s) => (
                <div key={s.label} className="flex items-baseline justify-between gap-2">
                  <span
                    className="text-[11px] font-medium uppercase tracking-[.08em]"
                    style={{ color: style.textColor, opacity: 0.5 }}
                  >
                    {s.label}
                  </span>
                  <span
                    className="text-lg font-bold leading-tight tracking-tight"
                    style={{ color: style.textColor, letterSpacing: "-0.02em" }}
                  >
                    {s.value}{" "}
                    <span className="text-sm font-medium" style={{ color: primaryColor }}>
                      {s.unit}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {}
        {footerBranding ? <div className="mt-4">{footerBranding}</div> : null}
      </div>

      {}
      <div
        className="relative hidden md:block"
        style={{
          minHeight: 200,
          ...(hasBg
            ? {
                backgroundImage: `url(${style.backgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                background: `linear-gradient(135deg, ${primaryColor}12 0%, ${primaryColor}06 100%)`,
              }),
        }}
      >
        {hasBg ? (
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(225deg, rgba(11,27,43,.15) 0%, transparent 50%)",
            }}
          />
        ) : null}
      </div>
    </section>
  );
}
