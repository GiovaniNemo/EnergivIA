"use client";

import type { JSX, ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, Clock3, TrendingUp } from "lucide-react";

interface InvestmentTheme {
  primary: string;
  secondary: string;
  text: string;
  background: string;
}

type InvestmentVariant = "hero" | "split" | "cards";

interface RoiRow {
  yearLabel: string;
  roi: number;
}

interface InvestmentSectionProps {
  totalInvestment: number;
  monthlySavings: number;
  showRoiChart: boolean;
  variant: InvestmentVariant;
  theme: InvestmentTheme;
  intro?: ReactNode;
}

function moneyBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function withAlpha(color: string, alpha: number): string {
  const hex = color.trim().replace("#", "");
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((chunk) => `${chunk}${chunk}`)
          .join("")
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return color;
  const intValue = Number.parseInt(expanded, 16);
  const r = (intValue >> 16) & 255;
  const g = (intValue >> 8) & 255;
  const b = intValue & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function buildRoiData(totalInvestment: number, monthlySavings: number, years = 8): RoiRow[] {
  const safeInvestment = Math.max(0, totalInvestment);
  const safeMonthlySavings = Math.max(0, monthlySavings);
  const data: RoiRow[] = [];
  for (let year = 0; year <= years; year += 1) {
    const roi = -safeInvestment + safeMonthlySavings * 12 * year;
    data.push({ yearLabel: year === 0 ? "Ano 0" : `${year} ano${year > 1 ? "s" : ""}`, roi });
  }
  return data;
}

function RoiTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: unknown }>;
  label?: string;
}): JSX.Element | null {
  if (!active || !payload?.length) return null;
  const roi = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-md border bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm">
      <p className="font-semibold">{label}</p>
      <p>ROI acumulado: {moneyBRL(roi)}</p>
    </div>
  );
}

export function InvestmentSection({
  totalInvestment,
  monthlySavings,
  showRoiChart,
  variant,
  theme,
  intro,
}: InvestmentSectionProps): JSX.Element {
  const yearlySavings = monthlySavings * 12;
  const paybackYears = yearlySavings > 0 ? totalInvestment / yearlySavings : 0;
  const roiData = buildRoiData(totalInvestment, monthlySavings);
  const positiveColor = withAlpha(theme.primary, 0.78);
  const negativeColor = withAlpha(theme.secondary, 0.75);
  const cardStyle = {
    border: `1px solid ${withAlpha(theme.text, 0.16)}`,
    backgroundColor: withAlpha(theme.background, 0.72),
    color: theme.text,
  };

  return (
    <div className="space-y-4">
      {intro ?? null}

      {variant === "hero" ? (
        <section
          className="overflow-hidden rounded-2xl shadow-[0_14px_30px_rgba(15,23,42,0.12)]"
          style={cardStyle}
        >
          <div
            className="border-b px-4 py-5 text-center"
            style={{ borderColor: withAlpha(theme.text, 0.12) }}
          >
            <p
              className="text-[11px] uppercase tracking-[0.12em]"
              style={{ color: withAlpha(theme.text, 0.62) }}
            >
              Investimento total do projeto
            </p>
            <p className="mt-2 text-4xl font-bold">{moneyBRL(totalInvestment)}</p>
            <p className="mt-2 text-sm" style={{ color: withAlpha(theme.text, 0.72) }}>
              Economia mensal estimada: {moneyBRL(monthlySavings)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 px-4 py-3 text-center">
            <MetricItem
              icon={<TrendingUp size={16} />}
              label="Economia mensal"
              value={moneyBRL(monthlySavings)}
            />
            <MetricItem
              icon={<CheckCircle2 size={16} />}
              label="Economia anual"
              value={moneyBRL(yearlySavings)}
            />
            <MetricItem
              icon={<Clock3 size={16} />}
              label="Payback estimado"
              value={paybackYears > 0 ? `${paybackYears.toFixed(1)} anos` : "n/a"}
            />
          </div>
        </section>
      ) : null}

      {variant === "split" ? (
        <section className="grid gap-4 rounded-2xl p-4 md:grid-cols-[2fr_1fr]" style={cardStyle}>
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: withAlpha(theme.background, 0.56) }}
          >
            <p className="text-sm font-semibold">Investimento</p>
            <p className="mt-1 text-5xl font-bold">{moneyBRL(totalInvestment)}</p>
            <p className="mt-2 text-sm" style={{ color: withAlpha(theme.text, 0.72) }}>
              Valor total a vista (fixo)
            </p>
            <ul className="mt-3 space-y-1 text-sm" style={{ color: withAlpha(theme.text, 0.86) }}>
              <li>- Modulos fotovoltaicos de alta eficiencia</li>
              <li>- Inversor com garantia estendida</li>
              <li>- Estrutura e instalacao</li>
              <li>- Homologacao na concessionaria</li>
            </ul>
          </div>
          <aside
            className="rounded-xl border p-4"
            style={{ borderColor: withAlpha(theme.text, 0.13) }}
          >
            <p className="text-lg font-semibold">O que esta incluso</p>
            <ul className="mt-3 space-y-2 text-sm" style={{ color: withAlpha(theme.text, 0.82) }}>
              <li>- Equipamentos premium</li>
              <li>- Resistencia verificada</li>
              <li>- Suporte pos-entrega</li>
            </ul>
            <p className="mt-4 text-sm font-medium" style={{ color: theme.primary }}>
              Economia mensal: {moneyBRL(monthlySavings)}
            </p>
          </aside>
        </section>
      ) : null}

      {variant === "cards" ? (
        <section className="grid gap-3 rounded-2xl p-4 md:grid-cols-[1.5fr_1fr]" style={cardStyle}>
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: withAlpha(theme.text, 0.14) }}
          >
            <p
              className="text-xs uppercase tracking-[0.08em]"
              style={{ color: withAlpha(theme.text, 0.62) }}
            >
              Investimento total
            </p>
            <p className="mt-1 text-4xl font-bold">{moneyBRL(totalInvestment)}</p>
            <p className="mt-1 text-sm" style={{ color: withAlpha(theme.text, 0.72) }}>
              Pagamento a vista
            </p>
          </div>
          <div className="grid gap-3">
            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: withAlpha(theme.primary, 0.35) }}
            >
              <p
                className="text-xs uppercase tracking-[0.08em]"
                style={{ color: withAlpha(theme.text, 0.62) }}
              >
                Economia mensal
              </p>
              <p className="mt-1 text-3xl font-bold" style={{ color: theme.primary }}>
                {moneyBRL(monthlySavings)}
              </p>
            </div>
            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: withAlpha(theme.text, 0.14) }}
            >
              <p className="text-sm font-semibold">Garantia e suporte</p>
              <p className="mt-2 text-sm" style={{ color: withAlpha(theme.text, 0.78) }}>
                Projeto, instalacao e suporte no pos-venda inclusos.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {showRoiChart ? (
        <section
          className="rounded-2xl border p-4"
          style={{ ...cardStyle, backgroundColor: withAlpha(theme.background, 0.62) }}
        >
          <p className="mb-3 text-sm font-semibold">ROI acumulado por ano</p>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={roiData}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={withAlpha(theme.text, 0.18)}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: withAlpha(theme.text, 0.68), fontSize: 11 }}
                  tickFormatter={(value) => moneyBRL(Number(value))}
                />
                <YAxis
                  type="category"
                  dataKey="yearLabel"
                  axisLine={false}
                  tickLine={false}
                  width={70}
                  tick={{ fill: withAlpha(theme.text, 0.8), fontSize: 11 }}
                />
                <ReferenceLine x={0} stroke={withAlpha(theme.text, 0.55)} strokeDasharray="4 4" />
                <Tooltip content={<RoiTooltip />} isAnimationActive={false} />
                <Bar
                  dataKey="roi"
                  isAnimationActive={false}
                  radius={[4, 4, 4, 4]}
                  fill={positiveColor}
                />
                <Bar
                  dataKey="roi"
                  isAnimationActive={false}
                  radius={[4, 4, 4, 4]}
                  fill={negativeColor}
                  minPointSize={3}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MetricItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="rounded-lg p-2">
      <div className="mb-1 flex items-center justify-center">{icon}</div>
      <p className="text-[11px] leading-tight text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
