"use client";

import { HeroMetric } from "./HeroMetric";
import { MetricCard } from "./MetricCard";
import { ConsumptionProductionChart } from "./ConsumptionProductionChart";
import { SystemPerformanceModernDashboardSection } from "./SystemPerformanceModernDashboardSection";
import { SystemPerformanceModernSection } from "./SystemPerformanceModernSection";
import type { SystemPerformanceSectionProps } from "./types";

export function SystemPerformanceSection({
  variant = "default",
  potencia,
  geracaoMensal,
  cobertura,
  equivalenteAmbiental,
  consumoMensal,
  producaoMensal,
  meses,
  theme,
  intro,
}: SystemPerformanceSectionProps): JSX.Element {
  if (variant === "modern_dashboard") {
    return (
      <SystemPerformanceModernDashboardSection
        consumoMensal={consumoMensal}
        cobertura={cobertura}
        equivalenteAmbiental={equivalenteAmbiental}
        geracaoMensal={geracaoMensal}
        intro={intro}
        meses={meses}
        potencia={potencia}
        producaoMensal={producaoMensal}
        theme={theme}
      />
    );
  }

  if (variant === "modern") {
    return (
      <SystemPerformanceModernSection
        consumoMensal={consumoMensal}
        cobertura={cobertura}
        equivalenteAmbiental={equivalenteAmbiental}
        geracaoMensal={geracaoMensal}
        intro={intro}
        meses={meses}
        potencia={potencia}
        producaoMensal={producaoMensal}
        theme={theme}
      />
    );
  }

  const pct = Math.round(cobertura * 100);

  return (
    <div className="space-y-8">
      {intro ? <div className="text-sm opacity-90">{intro}</div> : null}

      <HeroMetric potencia={potencia} theme={theme} />

      <div className="system-performance-metrics-grid grid gap-4">
        <MetricCard
          theme={theme}
          title="Geração estimada"
          value={`~ ${Math.round(geracaoMensal).toLocaleString("pt-BR")} kWh/mês`}
          footer="Estimativa mensal de geração"
        />
        <MetricCard
          theme={theme}
          title="Cobertura do consumo"
          value={`~ ${pct}%`}
          footer="Proporção do consumo atendido"
        />
        <MetricCard
          theme={theme}
          title="Equivalente ambiental"
          value={`até ${equivalenteAmbiental.toLocaleString("pt-BR")} árvores/ano`}
          footer="Impacto ambiental estimado"
        />
      </div>

      <ConsumptionProductionChart
        meses={meses}
        consumoMensal={consumoMensal}
        producaoMensal={producaoMensal}
        theme={theme}
      />
    </div>
  );
}
