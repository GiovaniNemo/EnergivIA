"use client";

import { useId, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SystemPerformanceTheme } from "./types";

export interface ConsumptionProductionChartProps {
  meses: string[];
  consumoMensal: number[];
  producaoMensal: number[];
  theme: SystemPerformanceTheme;
  height?: number;
  /** Estilo “Moderno”: fundo escuro, malha, curvas e brilho. */
  visualStyle?: "default" | "modern";
  /** Força todos os meses no eixo X (layouts estreitos / split). */
  compactXAxisTicks?: boolean;
}

interface Row {
  mes: string;
  consumo: number;
  producao: number;
}

function resolveChartColors(theme: SystemPerformanceTheme, modern: boolean) {
  // Garantia de contraste e semântica fotovoltaica:
  // Produção Solar: Verde Esmeralda Solar radiante
  // Consumo: Azul Sky / Cobalto contrastante
  const prodStroke = modern ? "#10b981" : "#059669";
  const consStroke = modern ? "#38bdf8" : "#0284c7";

  return { prodStroke, consStroke };
}

function ChartTooltip({
  active,
  payload,
  label,
  theme,
  modern,
  consStroke,
  prodStroke,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: unknown; value?: unknown }>;
  label?: string;
  theme: SystemPerformanceTheme;
  modern?: boolean;
  consStroke: string;
  prodStroke: string;
}) {
  if (!active || !payload?.length) return null;
  const rawConsumo = payload.find((p) => p.dataKey === "consumo")?.value;
  const rawProducao = payload.find((p) => p.dataKey === "producao")?.value;
  const consumo = Number(rawConsumo);
  const producao = Number(rawProducao);

  const hasConsumo = Number.isFinite(consumo);
  const hasProducao = Number.isFinite(producao);
  const saldo = hasProducao && hasConsumo ? producao - consumo : null;

  return (
    <div
      className="min-w-[210px] rounded-xl border px-3.5 py-3 text-xs shadow-2xl backdrop-blur-md"
      style={{
        backgroundColor: modern ? "rgba(11, 18, 32, 0.95)" : "rgba(255, 255, 255, 0.98)",
        borderColor: modern ? "rgba(255, 255, 255, 0.14)" : "rgba(15, 23, 42, 0.12)",
        color: theme.text,
        boxShadow: modern
          ? "0 16px 40px rgba(0,0,0,0.6), 0 0 20px rgba(16,185,129,0.12)"
          : "0 12px 32px rgba(15,23,42,0.12)",
      }}
    >
      <div
        className="mb-2.5 flex items-center justify-between border-b pb-1.5"
        style={{ borderColor: modern ? "rgba(255, 255, 255, 0.1)" : "rgba(15, 23, 42, 0.08)" }}
      >
        <p className="font-semibold text-xs tracking-wide">
          {label ? `Mês de ${label}` : "Visão Mensal"}
        </p>
      </div>

      <div className="space-y-2">
        {hasProducao ? (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5" style={{ color: prodStroke }}>
              <span
                className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]"
                style={{ backgroundColor: prodStroke }}
              />
              <span className="font-medium">Geração Solar</span>
            </span>
            <span className="font-semibold tabular-nums" style={{ color: theme.text }}>
              {producao.toLocaleString("pt-BR")} kWh
            </span>
          </div>
        ) : null}

        {hasConsumo ? (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5" style={{ color: consStroke }}>
              <span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: consStroke }} />
              <span className="font-medium">Consumo Unidade</span>
            </span>
            <span className="font-semibold tabular-nums" style={{ color: theme.text }}>
              {consumo.toLocaleString("pt-BR")} kWh
            </span>
          </div>
        ) : null}
      </div>

      {saldo != null ? (
        <div
          className="mt-2.5 flex items-center justify-between border-t pt-2 text-[11px]"
          style={{ borderColor: modern ? "rgba(255, 255, 255, 0.1)" : "rgba(15, 23, 42, 0.08)" }}
        >
          <span className="opacity-70">Saldo do Mês:</span>
          {saldo >= 0 ? (
            <span className="font-semibold text-emerald-400">
              +{saldo.toLocaleString("pt-BR")} kWh (crédito)
            </span>
          ) : (
            <span className="font-semibold text-amber-400">
              {saldo.toLocaleString("pt-BR")} kWh (rede)
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function ConsumptionProductionChart({
  meses,
  consumoMensal,
  producaoMensal,
  theme,
  height = 320,
  visualStyle = "default",
  compactXAxisTicks = false,
}: ConsumptionProductionChartProps): JSX.Element {
  const idBase = useId().replace(/:/g, "");
  const gradId = `${idBase}-fill`;
  const glowFilterId = `${idBase}-glow`;
  const modern = visualStyle === "modern";

  const { prodStroke, consStroke } = resolveChartColors(theme, modern);

  const gridStroke = modern ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)";

  const tickStyle = modern
    ? {
        fill: "rgba(255, 255, 255, 0.65)",
        fontSize: compactXAxisTicks ? 10 : 11,
      }
    : { fill: theme.text, fontSize: 11, opacity: 0.75 };

  const data: Row[] = useMemo(() => {
    const n = Math.min(meses.length, consumoMensal.length, producaoMensal.length);
    const rows: Row[] = [];
    for (let i = 0; i < n; i += 1) {
      rows.push({
        mes: String(meses[i] ?? ""),
        consumo: consumoMensal[i] ?? 0,
        producao: producaoMensal[i] ?? 0,
      });
    }
    return rows.length ? rows : [{ mes: "—", consumo: 0, producao: 0 }];
  }, [meses, consumoMensal, producaoMensal]);

  // Cálculos de médias para a legenda
  const { avgConsumo, avgProducao, coberturaPct } = useMemo(() => {
    if (!data.length) return { avgConsumo: 0, avgProducao: 0, coberturaPct: 0 };
    const totalConsumo = data.reduce((acc, row) => acc + row.consumo, 0);
    const totalProducao = data.reduce((acc, row) => acc + row.producao, 0);
    const cMean = Math.round(totalConsumo / data.length);
    const pMean = Math.round(totalProducao / data.length);
    const cob = totalConsumo > 0 ? Math.round((totalProducao / totalConsumo) * 100) : 0;
    return { avgConsumo: cMean, avgProducao: pMean, coberturaPct: cob };
  }, [data]);

  const areaType = modern ? "monotone" : "monotone";
  const lineType = modern ? "monotone" : "monotone";

  const prodDot = modern
    ? { r: 4.5, fill: "#ffffff", stroke: prodStroke, strokeWidth: 2.5 }
    : { r: 3.5, fill: prodStroke, strokeWidth: 0 };

  const consDot = modern
    ? { r: 4, fill: modern ? "#0b1220" : "#ffffff", stroke: consStroke, strokeWidth: 2 }
    : { r: 3, fill: consStroke, strokeWidth: 0 };

  return (
    <div
      className={`w-full rounded-2xl px-2 py-4 sm:px-4 ${modern ? "" : "shadow-[0_12px_32px_rgba(15,23,42,0.06)]"}`}
      style={
        modern
          ? {
              backgroundColor: "rgba(15, 23, 42, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
            }
          : {
              backgroundColor: `color-mix(in srgb, ${theme.text} 4%, ${theme.background})`,
              border: `1px solid color-mix(in srgb, ${theme.text} 8%, transparent)`,
            }
      }
    >
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={data}
          margin={
            modern
              ? compactXAxisTicks
                ? { top: 14, right: 8, left: 0, bottom: 36 }
                : { top: 16, right: 16, left: 4, bottom: 8 }
              : { top: 12, right: 12, left: 4, bottom: 8 }
          }
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={prodStroke} stopOpacity={modern ? 0.38 : 0.28} />
              <stop offset="100%" stopColor={prodStroke} stopOpacity={0.01} />
            </linearGradient>
            {modern ? (
              <filter id={glowFilterId} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ) : null}
          </defs>
          <CartesianGrid
            strokeDasharray={modern ? "4 6" : "3 3"}
            stroke={gridStroke}
            vertical={false}
          />
          <XAxis
            angle={compactXAxisTicks ? -32 : 0}
            axisLine={{ stroke: gridStroke }}
            dataKey="mes"
            dy={compactXAxisTicks ? 4 : 4}
            height={compactXAxisTicks ? 52 : undefined}
            interval={compactXAxisTicks ? 0 : 0}
            textAnchor={compactXAxisTicks ? "end" : "middle"}
            tick={tickStyle}
            tickLine={false}
          />
          <YAxis
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v) => `${Number(v).toLocaleString("pt-BR")}`}
          />
          <Tooltip
            content={(props) => (
              <ChartTooltip
                {...props}
                consStroke={consStroke}
                modern={modern}
                prodStroke={prodStroke}
                theme={theme}
              />
            )}
            cursor={{
              stroke: modern ? "rgba(255, 255, 255, 0.16)" : gridStroke,
              strokeWidth: 1,
              strokeDasharray: "3 3",
            }}
            isAnimationActive={false}
          />

          {/* Área de Produção Solar (Verde Esmeralda contínua e luminosa) */}
          <Area
            type={areaType}
            dataKey="producao"
            name="Produção Solar"
            stroke={prodStroke}
            strokeWidth={modern ? 2.5 : 2}
            fill={`url(#${gradId})`}
            dot={prodDot}
            filter={modern ? `url(#${glowFilterId})` : undefined}
            isAnimationActive={false}
          />

          {/* Linha de Consumo da Unidade (Azul Sky tracejada e contrastante) */}
          <Line
            type={lineType}
            dataKey="consumo"
            name="Consumo"
            stroke={consStroke}
            strokeWidth={modern ? 2.5 : 2}
            strokeDasharray="6 4"
            dot={consDot}
            filter={modern ? `url(#${glowFilterId})` : undefined}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legenda Informativa com Médias Calculadas e Diferenciação Nítida */}
      <div
        className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[11px] sm:text-xs"
        style={{
          color: modern
            ? "rgba(255, 255, 255, 0.75)"
            : `color-mix(in srgb, ${theme.text} 75%, transparent)`,
        }}
      >
        <div className="inline-flex items-center gap-2 rounded-lg bg-black/20 px-3 py-1.5 border border-white/5">
          <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: consStroke }} />
          <span className="font-medium text-white/90">Consumo Histórico</span>
          {avgConsumo > 0 ? (
            <span className="opacity-70 tabular-nums">
              ~{avgConsumo.toLocaleString("pt-BR")} kWh/mês
            </span>
          ) : null}
        </div>

        <div className="inline-flex items-center gap-2 rounded-lg bg-black/20 px-3 py-1.5 border border-white/5">
          <span
            className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_currentColor]"
            style={{ backgroundColor: prodStroke }}
          />
          <span className="font-medium text-white/90">Geração Solar Estimada</span>
          {avgProducao > 0 ? (
            <span className="opacity-70 tabular-nums">
              ~{avgProducao.toLocaleString("pt-BR")} kWh/mês
            </span>
          ) : null}
        </div>

        {coberturaPct > 0 ? (
          <div
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              color: "#34d399",
              border: "1px solid rgba(16, 185, 129, 0.25)",
            }}
          >
            <span>Autossuficiência ~{coberturaPct}%</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
