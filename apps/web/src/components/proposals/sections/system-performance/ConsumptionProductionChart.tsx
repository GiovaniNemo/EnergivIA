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

function ChartTooltip({
  active,
  payload,
  label,
  theme,
  modern,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: unknown; value?: unknown }>;
  label?: string;
  theme: SystemPerformanceTheme;
  modern?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const consumo = payload.find((p) => p.dataKey === "consumo")?.value;
  const producao = payload.find((p) => p.dataKey === "producao")?.value;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={
        modern
          ? {
              backgroundColor: `color-mix(in srgb, ${theme.background} 88%, #020617)`,
              borderColor: `color-mix(in srgb, ${theme.primary} 32%, transparent)`,
              color: theme.text,
              boxShadow: `0 12px 40px color-mix(in srgb, #000 55%, transparent), 0 0 20px color-mix(in srgb, ${theme.primary} 14%, transparent)`,
            }
          : {
              backgroundColor: `color-mix(in srgb, ${theme.text} 6%, ${theme.background})`,
              borderColor: `color-mix(in srgb, ${theme.text} 12%, transparent)`,
              color: theme.text,
            }
      }
    >
      <p className="font-semibold">{label}</p>
      {consumo != null && Number.isFinite(Number(consumo)) ? (
        <p className="mt-1" style={{ color: theme.primary }}>
          {Number(consumo).toLocaleString("pt-BR")} kWh Consumo
        </p>
      ) : null}
      {producao != null && Number.isFinite(Number(producao)) ? (
        <p className="mt-0.5" style={{ color: theme.secondary }}>
          {Number(producao).toLocaleString("pt-BR")} kWh Produção
        </p>
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
  const gridStroke = modern
    ? `color-mix(in srgb, ${theme.text} 16%, transparent)`
    : `color-mix(in srgb, ${theme.text} 14%, transparent)`;
  const tickStyle = modern
    ? {
        fill: `color-mix(in srgb, ${theme.text} 48%, transparent)`,
        fontSize: compactXAxisTicks ? 9 : 11,
      }
    : { fill: theme.text, fontSize: 11, opacity: 0.75 };

  const data: Row[] = useMemo(() => {
    const n = Math.min(meses.length, consumoMensal.length, producaoMensal.length);
    const rows: Row[] = [];
    for (let i = 0; i < n; i += 1) {
      rows.push({
        mes: meses[i] ?? "",
        consumo: consumoMensal[i] ?? 0,
        producao: producaoMensal[i] ?? 0,
      });
    }
    return rows.length ? rows : [{ mes: "—", consumo: 0, producao: 0 }];
  }, [meses, consumoMensal, producaoMensal]);

  const areaType = modern ? "natural" : "monotone";
  const lineType = modern ? "natural" : "monotone";
  const prodStroke = theme.secondary;
  const consStroke = theme.primary;
  const prodDot = modern
    ? { r: 4, fill: "#ffffff", stroke: prodStroke, strokeWidth: 2 }
    : { r: 3, fill: theme.secondary, strokeWidth: 0 };
  const consDot = modern
    ? { r: 4, fill: "#ffffff", stroke: consStroke, strokeWidth: 2 }
    : { r: 3, fill: theme.primary, strokeWidth: 0 };

  return (
    <div
      className={`w-full rounded-2xl px-2 py-4 sm:px-4 ${modern ? "" : "shadow-[0_12px_32px_rgba(15,23,42,0.06)]"}`}
      style={
        modern
          ? {
              backgroundColor: `color-mix(in srgb, ${theme.text} 6%, ${theme.background})`,
              border: `1px solid color-mix(in srgb, ${theme.primary} 22%, transparent)`,
              boxShadow: `inset 0 1px 0 color-mix(in srgb, ${theme.text} 8%, transparent)`,
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
              <stop offset="0%" stopColor={prodStroke} stopOpacity={modern ? 0.45 : 0.35} />
              <stop offset="100%" stopColor={prodStroke} stopOpacity={0} />
            </linearGradient>
            {modern ? (
              <filter id={glowFilterId} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
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
            vertical={modern}
          />
          <XAxis
            angle={compactXAxisTicks ? -32 : 0}
            axisLine={{ stroke: gridStroke }}
            dataKey="mes"
            dy={compactXAxisTicks ? 4 : 0}
            height={compactXAxisTicks ? 52 : undefined}
            interval={compactXAxisTicks ? 0 : undefined}
            textAnchor={compactXAxisTicks ? "end" : "middle"}
            tick={tickStyle}
            tickLine={false}
          />
          <YAxis
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            content={(props) => <ChartTooltip {...props} modern={modern} theme={theme} />}
            cursor={{
              stroke: modern ? `color-mix(in srgb, ${theme.primary} 28%, transparent)` : gridStroke,
              strokeWidth: 1,
            }}
            isAnimationActive={false}
          />
          <Area
            type={areaType}
            dataKey="producao"
            stroke={prodStroke}
            strokeWidth={modern ? 2.5 : 2}
            fill={`url(#${gradId})`}
            dot={prodDot}
            filter={modern ? `url(#${glowFilterId})` : undefined}
            isAnimationActive={false}
          />
          <Line
            type={lineType}
            dataKey="consumo"
            stroke={consStroke}
            strokeWidth={modern ? 2.5 : 2}
            dot={consDot}
            filter={modern ? `url(#${glowFilterId})` : undefined}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div
        className="mt-2 flex flex-wrap items-center justify-center gap-6 text-[11px] sm:text-xs"
        style={{
          color: modern
            ? `color-mix(in srgb, ${theme.text} 52%, transparent)`
            : `color-mix(in srgb, ${theme.text} 65%, transparent)`,
        }}
      >
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]"
            style={{ backgroundColor: consStroke }}
          />
          Consumo
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]"
            style={{ backgroundColor: prodStroke }}
          />
          Produção
        </span>
      </div>
    </div>
  );
}
