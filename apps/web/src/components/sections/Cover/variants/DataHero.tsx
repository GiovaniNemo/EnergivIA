"use client";

import type { ReactNode } from "react";
import type { CoverContent, CoverStyle, CoverTypographySizes } from "../cover-utils";

interface DataHeroProps {
  content: CoverContent;
  style: Required<CoverStyle>;
  typography: CoverTypographySizes;
  topBranding?: ReactNode;
  contentBranding?: ReactNode;
  footerBranding?: ReactNode;
  primaryColor?: string;
}

export function DataHero({
  content,
  style,
  typography,
  topBranding,
  footerBranding,
  primaryColor = "#22c55e",
}: DataHeroProps): React.JSX.Element {
  const minHeightPx = Math.round(250 * (style.coverHeight / 100));

  const bottomStats = [
    { value: content.coberturaConsumo, unit: "%", label: "Cobertura do consumo" },
    { value: content.geracaoMensal, unit: "kWh", label: "Geração mensal" },
    { value: content.equivalenteArvores, unit: "árv./ano", label: "Equivalente em árvores" },
  ].filter((s) => s.value?.trim());

  const eyebrow = content.date ? `Proposta · ${content.date}` : "Proposta";

  return (
    <section
      className="relative flex flex-col overflow-hidden"
      style={{
        minHeight: minHeightPx,
        backgroundColor: style.backgroundColor,
        color: style.textColor,
      }}
    >
      {}
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: -180,
          left: -180,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${primaryColor} 0%, transparent 60%)`,
          opacity: 0.25,
          filter: "blur(40px)",
        }}
      />
      {}
      <div
        className="pointer-events-none absolute"
        style={{
          top: "30%",
          right: -120,
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${primaryColor} 0%, transparent 60%)`,
          opacity: 0.2,
          filter: "blur(40px)",
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
      <div className="relative z-10 flex items-start justify-between p-6 md:p-9">
        {topBranding ?? null}
        <div
          className="rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ borderColor: `${primaryColor}55`, color: primaryColor }}
        >
          Solução sustentável
        </div>
      </div>

      {}
      <div className="relative z-10 mt-14 px-6 md:px-9">
        {}
        <p
          className="mb-4 text-[11px] font-semibold uppercase tracking-[.22em]"
          style={{ color: primaryColor }}
        >
          {eyebrow}
        </p>

        {}
        {content.title ? (
          <h2
            data-editor-field-path="title"
            className="mb-14 font-bold leading-tight tracking-tight"
            style={{ fontSize: typography.titleSize, color: style.textColor, maxWidth: "92%" }}
          >
            {content.title}
          </h2>
        ) : null}

        {}
        {content.potenciaKwp?.trim() ? (
          <div className="mb-8">
            <div
              className="flex items-baseline gap-3 font-extrabold leading-none tracking-tight"
              style={{
                fontSize: "clamp(72px, 15vw, 120px)",
                color: primaryColor,
                letterSpacing: "-0.06em",
                lineHeight: 0.9,
              }}
            >
              {content.potenciaKwp}
              <sup
                style={{
                  fontSize: "0.25em",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  verticalAlign: "super",
                }}
              >
                kWp
              </sup>
            </div>
            {}
            {content.subtitle ? (
              <div
                data-editor-field-path="subtitle"
                className="mt-2 max-w-xs text-[13px] leading-relaxed"
                style={{ color: style.textColor, opacity: 0.7 }}
                dangerouslySetInnerHTML={{ __html: content.subtitle }}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {}
      {bottomStats.length > 0 ? (
        <div
          className="relative z-10 mt-auto grid gap-5 border-t px-6 py-7 md:px-9"
          style={{
            borderColor: "rgba(255,255,255,0.15)",
            gridTemplateColumns: `repeat(${Math.min(bottomStats.length, 3)}, 1fr)`,
          }}
        >
          {bottomStats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <div
                className="text-xl font-bold leading-none tracking-tight"
                style={{ color: style.textColor }}
              >
                {s.value}{" "}
                <span
                  className="text-sm font-normal"
                  style={{ color: style.textColor, opacity: 0.6 }}
                >
                  {s.unit}
                </span>
              </div>
              <div
                className="text-[10px] font-medium uppercase tracking-[.12em]"
                style={{ color: style.textColor, opacity: 0.55 }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {}
      {footerBranding ? (
        <div className="relative z-10 px-6 pb-4 md:px-9">{footerBranding}</div>
      ) : null}
    </section>
  );
}
