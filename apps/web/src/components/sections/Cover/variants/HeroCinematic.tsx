"use client";

import type { ReactNode } from "react";
import type { CoverContent, CoverStyle, CoverTypographySizes } from "../cover-utils";

interface HeroCinematicProps {
  content: CoverContent;
  style: Required<CoverStyle>;
  typography: CoverTypographySizes;
  topBranding?: ReactNode;
  contentBranding?: ReactNode;
  footerBranding?: ReactNode;
  primaryColor?: string;
}

function parseHex(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result?.[1] || !result?.[2] || !result?.[3]) return null;
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

function getLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  return 0.2126 * (rgb[0] / 255) + 0.7152 * (rgb[1] / 255) + 0.0722 * (rgb[2] / 255);
}

export function HeroCinematic({
  content,
  style,
  typography,
  topBranding,
  footerBranding,
  primaryColor = "#22c55e",
}: HeroCinematicProps): React.JSX.Element {
  const minHeightPx = Math.round(250 * (style.coverHeight / 100));
  const hasBg = Boolean(style.backgroundImage);
  const bgColor = style.backgroundColor || "#0b1b2b";
  const lum = getLuminance(bgColor);
  const maxOpacity = lum > 0.5 ? 1.0 : 0.75;
  const midOpacity = lum > 0.5 ? 0.85 : 0.5;

  const stats = [
    { value: content.potenciaKwp, unit: "kWp", label: "Potência" },
    { value: content.geracaoMensal, unit: "kWh/mês", label: "Geração" },
    { value: content.coberturaConsumo, unit: "%", label: "Cobertura" },
  ].filter((s) => s.value?.trim());

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
        color: style.textColor,
      }}
    >
      {}
      {hasBg && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${hexToRgba(bgColor, maxOpacity)} 0%, ${hexToRgba(bgColor, midOpacity)} 30%, ${hexToRgba(bgColor, 0.08)} 65%, transparent 100%)`,
          }}
        />
      )}
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
          className="rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ background: primaryColor, color: "#0B1B2B" }}
        >
          Proposta
        </div>
      </div>

      {}
      <div className="relative z-10 mt-auto px-6 pb-6 md:px-9 md:pb-9">
        {}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-px w-6 shrink-0" style={{ background: primaryColor }} />
          <span
            className="text-[11px] font-semibold uppercase tracking-[.22em]"
            style={{ color: primaryColor }}
          >
            Solução sustentável
          </span>
        </div>

        {}
        {content.title ? (
          <h2
            data-editor-field-path="title"
            className="mb-6 font-bold leading-tight tracking-tight"
            style={{
              fontSize: Math.min(56, Math.max(typography.titleSize, 28)),
              color: style.textColor,
              maxWidth: "90%",
              letterSpacing: "-0.04em",
            }}
          >
            {content.title}
          </h2>
        ) : null}

        {}
        {content.subtitle ? (
          <div
            data-editor-field-path="subtitle"
            className="mb-8 text-base leading-relaxed"
            style={{ color: style.textColor, opacity: 0.82, maxWidth: "92%" }}
            dangerouslySetInnerHTML={{ __html: content.subtitle }}
          />
        ) : null}

        {}
        {stats.length > 0 ? (
          <div
            className="flex flex-wrap items-center gap-0 border-t pt-5"
            style={{ borderColor: "rgba(255,255,255,0.18)" }}
          >
            {stats.map((stat, i) => (
              <div key={stat.label} className="flex items-center">
                {i > 0 ? (
                  <div
                    className="mx-5 h-8 w-px shrink-0"
                    style={{ background: "rgba(255,255,255,0.18)" }}
                  />
                ) : null}
                <div>
                  <div
                    className="text-[22px] font-bold leading-tight tracking-tight"
                    style={{ color: style.textColor, letterSpacing: "-0.02em" }}
                  >
                    {stat.value}{" "}
                    <span style={{ color: primaryColor, fontWeight: 500 }}>{stat.unit}</span>
                  </div>
                  <div
                    className="mt-1 text-[10px] font-medium uppercase tracking-[.1em]"
                    style={{ color: style.textColor, opacity: 0.6 }}
                  >
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {}
      {footerBranding ? (
        <div className="relative z-10 px-6 pb-4 md:px-10">{footerBranding}</div>
      ) : null}
    </section>
  );
}
