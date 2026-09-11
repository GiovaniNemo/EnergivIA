import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TrendingUp, Landmark, Leaf, FileCheck, Award } from "lucide-react";

export const Scene5ProposalFinance: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterScale = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  // Animated counters
  const savingsVal = Math.round(
    interpolate(frame, [15, 65], [0, 285400], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  const paybackVal = interpolate(frame, [25, 70], [5.5, 2.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }).toFixed(1);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 100px",
        gap: 60,
      }}
    >
      {/* Left side: Context and value proposition */}
      <div style={{ flex: 1, maxWidth: 540 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 999,
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            color: "#34D399",
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          <FileCheck size={16} />
          <span>Propostas Irresistíveis</span>
        </div>

        <h2
          style={{
            fontSize: 46,
            fontWeight: 800,
            lineHeight: 1.2,
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
            margin: "0 0 16px 0",
          }}
        >
          Apresente propostas que{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #10B981 0%, #38BDF8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            encantam e convertem.
          </span>
        </h2>

        <p
          style={{
            fontSize: 18,
            color: "#94A3B8",
            lineHeight: 1.6,
            margin: "0 0 28px 0",
          }}
        >
          Documentos profissionais, 100% personalizados com a sua marca e cores.
          Análise financeira detalhada que elimina todas as dúvidas do seu
          cliente.
        </p>

        {/* Feature badges */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 18px",
              borderRadius: 14,
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Landmark size={20} color="#38BDF8" />
            <div>
              <div style={{ color: "#FFFFFF", fontSize: 15, fontWeight: 700 }}>
                Financiamento Bancário Integrado
              </div>
              <div style={{ color: "#94A3B8", fontSize: 13 }}>
                Simulação de parcelas BV, Santander, Solfácil e outros
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 18px",
              borderRadius: 14,
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Leaf size={20} color="#34D399" />
            <div>
              <div style={{ color: "#FFFFFF", fontSize: 15, fontWeight: 700 }}>
                Métricas ESG & Sustentabilidade
              </div>
              <div style={{ color: "#94A3B8", fontSize: 13 }}>
                Árvores salvas e toneladas de CO₂ evitadas
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Modern Proposal Card Showcase */}
      <div
        style={{
          flex: 1.2,
          maxWidth: 620,
          transform: `scale(${enterScale})`,
          background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: 24,
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow:
            "0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(16, 185, 129, 0.15)",
          padding: 32,
        }}
      >
        {/* Proposal Header Banner */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 20,
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            marginBottom: 24,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#10B981",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              PROPOSTA COMERCIAL SOLAR
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#FFFFFF",
                marginTop: 4,
              }}
            >
              Sistema Solar Fotovoltaico 7.2 kWp
            </div>
          </div>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34D399",
              fontSize: 13,
              fontWeight: 700,
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            Sua Marca Aqui
          </div>
        </div>

        {/* Big Financial Highlight Cards */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}
        >
          <div
            style={{
              padding: 22,
              borderRadius: 18,
              background:
                "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={20} color="#34D399" />
              <span style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 600 }}>
                ECONOMIA ESTIMADA (25 ANOS)
              </span>
            </div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 900,
                color: "#34D399",
                marginTop: 8,
              }}
            >
              R$ {savingsVal.toLocaleString("pt-BR")}
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
              Proteção total contra a inflação energética
            </div>
          </div>

          <div
            style={{
              padding: 22,
              borderRadius: 18,
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Award size={20} color="#38BDF8" />
              <span style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 600 }}>
                RETORNO (PAYBACK)
              </span>
            </div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 900,
                color: "#FFFFFF",
                marginTop: 8,
              }}
            >
              {paybackVal}{" "}
              <span style={{ fontSize: 20, color: "#38BDF8" }}>anos</span>
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
              Retorno financeiro superior a qualquer CDI
            </div>
          </div>
        </div>

        {/* Bank Financing Callout */}
        <div
          style={{
            marginTop: 20,
            padding: 18,
            borderRadius: 16,
            background: "rgba(14, 165, 233, 0.1)",
            border: "1px solid rgba(14, 165, 233, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                padding: 10,
                borderRadius: 12,
                background: "rgba(14, 165, 233, 0.2)",
                color: "#38BDF8",
              }}
            >
              <Landmark size={22} />
            </div>
            <div>
              <div style={{ color: "#FFFFFF", fontSize: 15, fontWeight: 700 }}>
                Financiamento sem entrada
              </div>
              <div style={{ color: "#94A3B8", fontSize: 13 }}>
                Parcelas de R$ 740/mês menores que a fatura atual
              </div>
            </div>
          </div>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              background: "#38BDF8",
              color: "#0F172A",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            Simular Bancos
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
