import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Zap, Sun, BarChart3, Compass, CheckCircle } from "lucide-react";

export const Scene3Engineering: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterScale = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  // Animated power counter: 0.0 -> 7.2 kWp
  const powerVal = interpolate(frame, [15, 60], [0, 7.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }).toFixed(1);

  // Animated generation counter: 0 -> 940 kWh
  const genVal = Math.round(
    interpolate(frame, [25, 75], [0, 945], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  // Monthly generation bars height percentage (Jan - Dec)
  const monthlyGen = [85, 82, 88, 75, 68, 62, 70, 80, 85, 92, 95, 90];

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
      {/* Left side: Engineering specs and rules */}
      <div style={{ flex: 1, maxWidth: 540 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 999,
            background: "rgba(245, 158, 11, 0.15)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            color: "#FBBF24",
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          <Compass size={16} />
          <span>Engenharia Solar & Lei 14.300</span>
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
          Dimensionamento preciso com{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #F59E0B 0%, #10B981 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            irradiação solar real.
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
          Dados solarimétricos de todos os municípios brasileiros integrados com
          regras de compensação da Lei 14.300 e catálogo de distribuidores
          parceiros.
        </p>

        {/* Feature bullets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            "Seleção automática do kit ideal (Módulos + Inversores)",
            "Cálculo exato de fio B e compensação tarifária",
            "Mapeamento de área de telhado e perdas por sombreamento",
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "#F1F5F9",
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              <CheckCircle size={18} color="#10B981" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right side: Interactive System Sizing Board & Generation Chart */}
      <div
        style={{
          flex: 1.2,
          maxWidth: 620,
          transform: `scale(${enterScale})`,
          background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: 24,
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6)",
          padding: 32,
        }}
      >
        {/* Top metrics pill */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <div
            style={{
              padding: 20,
              borderRadius: 16,
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={18} color="#FBBF24" />
              <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>
                POTÊNCIA INSTALADA
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
              {powerVal}{" "}
              <span style={{ fontSize: 20, color: "#FBBF24" }}>kWp</span>
            </div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
              12 painéis de 600W Tier-1
            </div>
          </div>

          <div
            style={{
              padding: 20,
              borderRadius: 16,
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sun size={18} color="#34D399" />
              <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>
                GERAÇÃO ESTIMADA
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
              {genVal}{" "}
              <span style={{ fontSize: 20, color: "#34D399" }}>kWh/mês</span>
            </div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
              Atende 105% do consumo
            </div>
          </div>
        </div>

        {/* Animated Generation Chart */}
        <div style={{ marginTop: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart3 size={18} color="#38BDF8" />
              <span style={{ color: "#F8FAFC", fontSize: 15, fontWeight: 700 }}>
                Previsão de Geração Mês a Mês (kWh)
              </span>
            </div>
            <span style={{ fontSize: 12, color: "#10B981", fontWeight: 600 }}>
              HSP Médio: 4.88 kWh/m²
            </span>
          </div>

          {/* Bar chart container */}
          <div
            style={{
              height: 160,
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
              background: "rgba(0, 0, 0, 0.35)",
              padding: "20px 16px 12px 16px",
              borderRadius: 16,
              position: "relative",
            }}
          >
            {/* Reference target line */}
            <div
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                top: "40%",
                height: 1,
                borderTop: "1px dashed rgba(56, 189, 248, 0.4)",
              }}
            />

            {monthlyGen.map((val, idx) => {
              const barProgress = interpolate(
                frame - 30 - idx * 2,
                [0, 20],
                [0, 1],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                },
              );

              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    height: "100%",
                    justifyContent: "flex-end",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${val * barProgress}%`,
                      background:
                        "linear-gradient(180deg, #10B981 0%, #047857 100%)",
                      borderRadius: 4,
                      boxShadow:
                        barProgress > 0.8
                          ? "0 0 10px rgba(16, 185, 129, 0.4)"
                          : "none",
                    }}
                  />
                  <span style={{ fontSize: 10, color: "#64748B" }}>
                    {
                      [
                        "J",
                        "F",
                        "M",
                        "A",
                        "M",
                        "J",
                        "J",
                        "A",
                        "S",
                        "O",
                        "N",
                        "D",
                      ][idx]
                    }
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
