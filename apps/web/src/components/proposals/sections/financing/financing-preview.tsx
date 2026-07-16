"use client";

import type { ReactNode } from "react";
import type { ProposalSection } from "@/components/proposals/editor/types";
import { resolveSectionVariant } from "@/components/proposals/editor/section-fields";
import type { PreviewRenderVariables } from "@/components/proposals/editor/section-render/types";
import { brandingToStepsTheme, withAlpha } from "@/components/proposals/sections/steps/steps-theme";
type ProposalBranding = {
  textColor: string;
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
};

interface FinancingPreviewProps {
  section: ProposalSection;
  vars: PreviewRenderVariables;
  branding?: ProposalBranding;
  intro?: ReactNode;
  helperText?: ReactNode;
}

function InfoIcon({ color }: { color: string }): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CheckIcon(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function BoltIcon({ color }: { color: string }): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function SplitVariant({
  parcela,
  meses,
  entrada,
  theme,
}: {
  parcela: string;
  meses: string;
  entrada: string;
  theme: ReturnType<typeof brandingToStepsTheme>;
}): JSX.Element {
  const anos = meses ? `${Math.round(Number(meses.replace(/\D/g, "")) / 12)} anos` : "";

  return (
    <div
      className="financing-split-card"
      style={{
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: `0 4px 24px ${withAlpha(theme.primary, 0.15)}`,
      }}
    >
      {}
      <div
        className="financing-split-left"
        style={{
          background: theme.primary,
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: -30,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            pointerEvents: "none",
          }}
        />

        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.09em",
            color: "rgba(255,255,255,0.65)",
            position: "relative",
          }}
        >
          parcela mensal
        </p>
        <div
          style={{
            fontSize: "clamp(32px, 5vw, 44px)",
            fontWeight: 900,
            color: "#fff",
            letterSpacing: -1.5,
            lineHeight: 1,
            position: "relative",
          }}
        >
          {parcela}
        </div>
        <p
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.6)",
            position: "relative",
            marginTop: 2,
          }}
        >
          por mês · sujeito à análise de crédito
        </p>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 100,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            marginTop: 12,
            width: "fit-content",
            position: "relative",
          }}
        >
          <CheckIcon />
          Aprovação rápida
        </div>
      </div>

      {}
      <div
        className="financing-split-right"
        style={{
          background: "#fff",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {[
          {
            label: "Prazo total",
            value: meses,
            note: anos ? `${anos} de financiamento` : "de financiamento",
          },
          { label: "Entrada", value: entrada, note: "Valor de entrada" },
          { label: "Início das parcelas", value: "Pós-obra", note: "Após a instalação do sistema" },
        ].map((row, i, arr) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              padding: "14px 0",
              borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.08)" : "none",
              paddingTop: i === 0 ? 0 : undefined,
              paddingBottom: i === arr.length - 1 ? 0 : undefined,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#9CA3AF",
              }}
            >
              {row.label}
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, color: theme.text, letterSpacing: -0.3 }}>
              {row.value}
            </span>
            <span style={{ fontSize: 12, color: "#6B7280", marginTop: 1 }}>{row.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonVariant({
  parcela,
  meses,
  entrada,
  theme,
  monthlyBill,
}: {
  parcela: string;
  meses: string;
  entrada: string;
  theme: ReturnType<typeof brandingToStepsTheme>;
  monthlyBill?: string;
}): JSX.Element {
  const anos = meses ? `${Math.round(Number(meses.replace(/\D/g, "")) / 12)} anos` : "";
  const hasBill = !!monthlyBill;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {}
      <div
        style={{
          background: withAlpha(theme.primary, 0.1),
          border: `1.5px solid ${withAlpha(theme.primary, 0.2)}`,
          borderRadius: 18,
          padding: "1.75rem 2rem",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.09em",
            color: theme.primary,
            marginBottom: 8,
          }}
        >
          Parcela mensal
        </p>
        <div
          style={{
            fontSize: "clamp(40px, 8vw, 56px)",
            fontWeight: 900,
            color: theme.primary,
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          {parcela}
        </div>
        <p
          style={{
            fontSize: 13,
            color: withAlpha(theme.primary, 0.8),
            marginTop: 6,
            fontWeight: 500,
          }}
        >
          por mês · sujeito à análise de crédito
        </p>
      </div>

      {}
      <div className="financing-details-grid">
        {[
          { label: "Prazo total", value: meses, note: anos },
          { label: "Entrada", value: entrada, note: "Valor de entrada" },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 14,
              padding: "1.1rem 1.25rem",
            }}
          >
            <small
              style={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#9CA3AF",
                marginBottom: 5,
              }}
            >
              {card.label}
            </small>
            <strong
              style={{ fontSize: 21, fontWeight: 800, color: theme.text, letterSpacing: -0.3 }}
            >
              {card.value}
            </strong>
            <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{card.note}</p>
          </div>
        ))}
      </div>

      {}
      {hasBill && (
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 14,
            padding: "1.1rem 1.25rem",
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: withAlpha(theme.primary, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BoltIcon color={theme.primary} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <small
              style={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "#9CA3AF",
                marginBottom: 5,
              }}
            >
              Por que faz sentido?
            </small>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "#6B7280" }}>
              Sua conta atual de <strong style={{ color: theme.text }}>{monthlyBill}/mês</strong>{" "}
              vira uma parcela de{" "}
              <span style={{ color: theme.primary, fontWeight: 800 }}>{parcela}</span> — você paga
              menos e ainda investe em patrimônio próprio.
            </p>
            {}
            <div style={{ marginTop: 12 }}>
              {[
                {
                  label: "Conta atual",
                  width: "100%",
                  color: "#E24B4A",
                  value: monthlyBill,
                  valColor: "#A32D2D",
                },
                {
                  label: "Parcela solar",
                  width: "68%",
                  color: theme.primary,
                  value: parcela,
                  valColor: theme.primary,
                },
              ].map((bar) => (
                <div
                  key={bar.label}
                  style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}
                >
                  <span
                    style={{ fontSize: 11, color: "#6B7280", minWidth: 90, textAlign: "right" }}
                  >
                    {bar.label}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: withAlpha(theme.primary, 0.1),
                      borderRadius: 100,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: bar.width,
                        background: bar.color,
                        borderRadius: 100,
                      }}
                    />
                  </div>
                  <span
                    style={{ fontSize: 12, fontWeight: 700, minWidth: 60, color: bar.valColor }}
                  >
                    {bar.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditorialVariant({
  parcela,
  meses,
  entrada,
  theme,
  bodyText,
}: {
  parcela: string;
  meses: string;
  entrada: string;
  theme: ReturnType<typeof brandingToStepsTheme>;
  bodyText?: ReactNode;
}): JSX.Element {
  const anos = meses ? `${Math.round(Number(meses.replace(/\D/g, "")) / 12)} anos` : "";

  return (
    <div className="financing-editorial-wrap">
      {}
      <div className="financing-editorial-left">
        <div
          style={{
            fontSize: "clamp(56px, 12vw, 80px)",
            fontWeight: 900,
            color: theme.text,
            letterSpacing: -4,
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          {parcela}
        </div>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: "1.5rem", fontWeight: 500 }}>
          por mês · sujeito à análise
        </p>
        <div
          style={{
            width: 44,
            height: 3,
            background: theme.primary,
            borderRadius: 2,
            marginBottom: "1.25rem",
          }}
        />
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "#6B7280", maxWidth: 340 }}>
          {bodyText}
        </div>
      </div>

      {}
      <div className="financing-editorial-right">
        {}
        <div
          style={{
            background: theme.primary,
            border: `1px solid ${theme.primary}`,
            borderRadius: 14,
            padding: "1.1rem 1.25rem",
          }}
        >
          <small
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.09em",
              color: "rgba(255,255,255,0.6)",
              marginBottom: 5,
            }}
          >
            Prazo total
          </small>
          <strong
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: -0.4,
              display: "block",
            }}
          >
            {meses}
          </strong>
          {anos && (
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{anos}</p>
          )}
        </div>

        {}
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 14,
            padding: "1.1rem 1.25rem",
          }}
        >
          <small
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.09em",
              color: "#9CA3AF",
              marginBottom: 5,
            }}
          >
            Entrada
          </small>
          <strong
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
              letterSpacing: -0.4,
              display: "block",
            }}
          >
            {entrada}
          </strong>
          <p style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Valor de entrada</p>
        </div>

        {}
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 14,
            padding: "1.1rem 1.25rem",
          }}
        >
          <small
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.09em",
              color: "#9CA3AF",
              marginBottom: 5,
            }}
          >
            Início
          </small>
          <strong
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
              letterSpacing: -0.4,
              display: "block",
            }}
          >
            Pós-obra
          </strong>
          <p style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Após instalação</p>
        </div>

        {}
        <div
          style={{
            background: withAlpha(theme.primary, 0.1),
            border: `1px solid ${withAlpha(theme.primary, 0.2)}`,
            borderRadius: 14,
            padding: "0.9rem 1.1rem",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: theme.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "#fff",
            }}
          >
            <CheckIcon />
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: withAlpha(theme.primary, 0.85),
              lineHeight: 1.35,
            }}
          >
            Aprovação rápida e sem burocracia
          </span>
        </div>
      </div>
    </div>
  );
}

export function FinancingPreview({
  section,
  vars,
  branding,
  intro,
  helperText,
}: FinancingPreviewProps): JSX.Element {
  const theme = brandingToStepsTheme(branding);
  const variant = resolveSectionVariant("financing", section.variant);
  const f = (section.fields ?? {}) as Record<string, unknown>;

  const parcela = vars.financiamento_parcela || "";
  const meses = vars.financiamento_meses || "";
  const entrada = vars.financiamento_entrada || "";
  const rawBill = f["monthlyBill"];
  const monthlyBill =
    typeof rawBill === "string" || typeof rawBill === "number" ? String(rawBill) : "";

  const footerColor = withAlpha(theme.text, 0.45);

  return (
    <div
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}
    >
      {}
      {intro && <div style={{ marginBottom: "1.75rem" }}>{intro}</div>}

      {variant === "split" && (
        <SplitVariant parcela={parcela} meses={meses} entrada={entrada} theme={theme} />
      )}
      {variant === "editorial" && (
        <EditorialVariant
          parcela={parcela}
          meses={meses}
          entrada={entrada}
          theme={theme}
          bodyText={helperText}
        />
      )}
      {variant !== "split" && variant !== "editorial" && (
        <ComparisonVariant
          parcela={parcela}
          meses={meses}
          entrada={entrada}
          theme={theme}
          monthlyBill={monthlyBill}
        />
      )}

      {}
      <div
        style={{
          marginTop: "1.25rem",
          display: "flex",
          alignItems: "flex-start",
          gap: 6,
          fontSize: 12,
          color: footerColor,
          lineHeight: 1.5,
          borderTop: `1px solid ${withAlpha(theme.text, 0.08)}`,
          paddingTop: "1.25rem",
        }}
      >
        <InfoIcon color={theme.primary} />
        <span>
          Valores sujeitos à aprovação de crédito junto à instituição financeira parceira.
        </span>
      </div>
    </div>
  );
}
