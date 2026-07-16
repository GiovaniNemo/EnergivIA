"use client";

import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { Sun, Trees, Zap } from "lucide-react";
import { ConsumptionProductionChart } from "./ConsumptionProductionChart";
import type { SystemPerformanceSectionProps, SystemPerformanceTheme } from "./types";

function ModernGlassMetric({
  theme,
  icon: Icon,
  accent,
  title,
  value,
  footer,
  iconFramed,
}: {
  theme: SystemPerformanceTheme;
  icon: LucideIcon;
  accent: "primary" | "secondary";
  title: string;
  value: string;
  footer: string;
  iconFramed?: boolean;
}) {
  const bar =
    accent === "primary"
      ? `linear-gradient(90deg, ${theme.primary}, color-mix(in srgb, ${theme.primary} 52%, ${theme.secondary}))`
      : `linear-gradient(90deg, ${theme.secondary}, color-mix(in srgb, ${theme.secondary} 52%, ${theme.primary}))`;
  const glowMain = accent === "primary" ? theme.primary : theme.secondary;

  return (
    <div
      className="relative overflow-hidden rounded-2xl px-5 py-4 backdrop-blur-md"
      style={{
        backgroundColor: `color-mix(in srgb, ${theme.text} 8%, transparent)`,
        border: `1px solid color-mix(in srgb, ${theme.text} 14%, transparent)`,
        boxShadow: `inset 0 1px 0 color-mix(in srgb, ${theme.text} 8%, transparent)`,
      }}
    >
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl"
        style={{
          background: bar,
          boxShadow: `0 12px 40px color-mix(in srgb, ${glowMain} 24%, transparent)`,
        }}
      />
      <div className="mb-3 flex items-center" style={{ color: theme.primary }}>
        {iconFramed ? (
          <span
            className="inline-flex rounded-full p-2"
            style={{
              border: `1px solid color-mix(in srgb, ${theme.primary} 38%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${theme.primary} 12%, transparent)`,
            }}
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </span>
        ) : (
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        )}
      </div>
      <p
        className="text-xs font-medium uppercase tracking-wide"
        style={{ color: `color-mix(in srgb, ${theme.text} 48%, transparent)` }}
      >
        {title}
      </p>
      <p
        className="system-performance-metric-value mt-1 text-lg font-semibold"
        style={{ color: theme.text }}
      >
        {value}
      </p>
      <p
        className="mt-2 text-[11px] leading-snug"
        style={{ color: `color-mix(in srgb, ${theme.text} 40%, transparent)` }}
      >
        {footer}
      </p>
    </div>
  );
}

export function SystemPerformanceModernSection({
  potencia,
  geracaoMensal,
  cobertura,
  equivalenteAmbiental,
  consumoMensal,
  producaoMensal,
  meses,
  theme,
  intro,
}: Omit<SystemPerformanceSectionProps, "variant">): JSX.Element {
  const pct = Math.round(cobertura * 100);
  const formatted = Number.isFinite(potencia) ? potencia.toFixed(2) : "—";

  const panelStyle: CSSProperties = {
    background: `linear-gradient(165deg, color-mix(in srgb, ${theme.background} 86%, ${theme.primary}) 0%, ${theme.background} 42%, color-mix(in srgb, ${theme.background} 76%, #020617) 100%)`,
    border: `1px solid color-mix(in srgb, ${theme.primary} 28%, transparent)`,
    boxShadow: `0 0 80px -24px color-mix(in srgb, ${theme.primary} 30%, transparent), inset 0 1px 0 color-mix(in srgb, ${theme.text} 10%, transparent)`,
  };

  const introStyle = {
    color: `color-mix(in srgb, ${theme.text} 72%, transparent)`,
    "--gen-modern-link": theme.primary,
  } as CSSProperties;

  return (
    <div
      className="system-performance-panel relative overflow-hidden rounded-3xl p-6"
      style={panelStyle}
    >
      <div
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full blur-3xl"
        style={{ backgroundColor: `color-mix(in srgb, ${theme.primary} 14%, transparent)` }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-10 h-56 w-56 rounded-full blur-3xl"
        style={{ backgroundColor: `color-mix(in srgb, ${theme.secondary} 12%, transparent)` }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      <div className="relative z-10 space-y-8">
        <div className="system-performance-metrics-grid grid gap-4">
          <ModernGlassMetric
            accent="primary"
            footer="Estimativa mensal de geração"
            icon={Sun}
            theme={theme}
            title="Geração estimada"
            value={`~ ${Math.round(geracaoMensal).toLocaleString("pt-BR")} kWh/mês`}
          />
          <ModernGlassMetric
            accent="primary"
            footer="Proporção do consumo atendido"
            icon={Zap}
            iconFramed
            theme={theme}
            title="Cobertura do consumo"
            value={`~ ${pct}%`}
          />
          <ModernGlassMetric
            accent="secondary"
            footer="Impacto ambiental estimado"
            icon={Trees}
            theme={theme}
            title="Equivalente ambiental"
            value={`até ${equivalenteAmbiental.toLocaleString("pt-BR")} árvores/ano`}
          />
        </div>

        <div className="text-center">
          <p
            className="system-performance-capacity-value relative inline-block text-4xl font-bold tracking-tight"
            style={{
              color: theme.text,
              textShadow: `0 0 28px color-mix(in srgb, ${theme.primary} 50%, transparent), 0 0 52px color-mix(in srgb, ${theme.secondary} 28%, transparent), 0 0 2px color-mix(in srgb, ${theme.text} 35%, transparent)`,
            }}
          >
            <span
              className="absolute -left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
              style={{
                backgroundColor: theme.text,
                boxShadow: `0 0 14px 3px color-mix(in srgb, ${theme.text} 85%, ${theme.primary})`,
              }}
              aria-hidden
            />
            <span className="pl-3">{formatted} kWp</span>
          </p>
          <p
            className="mt-3 text-sm font-medium"
            style={{ color: `color-mix(in srgb, ${theme.text} 52%, transparent)` }}
          >
            Capacidade do Sistema
          </p>
        </div>

        {intro ? (
          <div
            className="mx-auto max-w-2xl text-center text-sm [&_a]:text-[color:var(--gen-modern-link)] [&_a]:underline [&_p]:leading-relaxed"
            style={introStyle}
          >
            {intro}
          </div>
        ) : null}

        <div className="space-y-3">
          <p
            className="text-center text-xs font-medium uppercase tracking-[0.12em]"
            style={{ color: `color-mix(in srgb, ${theme.text} 38%, transparent)` }}
          >
            Consumo vs produção (kWh) — visão mensal
          </p>
          <ConsumptionProductionChart
            consumoMensal={consumoMensal}
            height={340}
            meses={meses}
            producaoMensal={producaoMensal}
            theme={theme}
            visualStyle="modern"
          />
        </div>
      </div>
    </div>
  );
}
