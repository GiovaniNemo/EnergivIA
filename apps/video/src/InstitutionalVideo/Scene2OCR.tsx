import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FileText, CheckCircle2, ScanLine, Sparkles, Cpu } from "lucide-react";

export const Scene2OCR: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance
  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  // Laser scanner animation
  const scannerY = interpolate(frame % 70, [0, 70], [20, 480], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Staggered data fields reveal
  const field1Opacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const field2Opacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const field3Opacity = interpolate(frame, [45, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const field4Opacity = interpolate(frame, [60, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Animated counter for kWh
  const consumptionVal = Math.round(
    interpolate(frame, [25, 65], [120, 845], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

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
      {/* Left side: Bill document with Laser Scan effect */}
      <div
        style={{
          flex: 1,
          maxWidth: 480,
          transform: `scale(${enterSpring})`,
          position: "relative",
        }}
      >
        <div
          style={{
            background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
            borderRadius: 24,
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow:
              "0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(16, 185, 129, 0.15)",
            padding: 32,
            height: 520,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Laser Scanner Line */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: scannerY,
              height: 4,
              background:
                "linear-gradient(90deg, transparent, #10B981, #38BDF8, transparent)",
              boxShadow:
                "0 0 20px #10B981, 0 0 40px #10B981, 0 -15px 30px rgba(16, 185, 129, 0.3)",
              zIndex: 20,
              pointerEvents: "none",
            }}
          />

          {/* Fake Bill Mock Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              paddingBottom: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  padding: 8,
                  borderRadius: 10,
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34D399",
                }}
              >
                <FileText size={20} />
              </div>
              <div>
                <div
                  style={{ color: "#F8FAFC", fontSize: 16, fontWeight: 700 }}
                >
                  FATURA DE ENERGIA
                </div>
                <div style={{ color: "#94A3B8", fontSize: 12 }}>
                  PDF / Foto enviada pelo cliente
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: 12,
                color: "#10B981",
                background: "rgba(16, 185, 129, 0.15)",
                padding: "4px 10px",
                borderRadius: 999,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <ScanLine size={12} />
              Escaneando com IA
            </span>
          </div>

          {/* Bill skeleton lines & items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                height: 18,
                width: "70%",
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: 6,
              }}
            />
            <div
              style={{
                height: 14,
                width: "90%",
                background: "rgba(255, 255, 255, 0.06)",
                borderRadius: 6,
              }}
            />
            <div
              style={{
                height: 14,
                width: "50%",
                background: "rgba(255, 255, 255, 0.06)",
                borderRadius: 6,
              }}
            />

            {/* Simulated bar chart inside bill */}
            <div
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 12,
                background: "rgba(0, 0, 0, 0.3)",
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                height: 140,
              }}
            >
              {[45, 65, 55, 78, 85, 92, 70, 80, 88, 95, 75, 85].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background:
                      i === 11
                        ? "linear-gradient(180deg, #10B981, #047857)"
                        : "rgba(255, 255, 255, 0.15)",
                    borderRadius: 4,
                  }}
                />
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 20,
                padding: 12,
                background: "rgba(16, 185, 129, 0.08)",
                borderRadius: 10,
                border: "1px dashed rgba(16, 185, 129, 0.3)",
              }}
            >
              <span style={{ color: "#94A3B8", fontSize: 13 }}>
                Total a pagar:
              </span>
              <span style={{ color: "#34D399", fontWeight: 700, fontSize: 16 }}>
                R$ 874,20
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: AI Extracted Parameters */}
      <div style={{ flex: 1.2, maxWidth: 640 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 999,
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#34D399",
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          <Cpu size={16} />
          <span>Extração Inteligente por Visão Computacional</span>
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
          Adeus digitação manual.{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #10B981 0%, #38BDF8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Leitura em segundos.
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
          Basta subir o PDF ou foto da fatura. Nossa IA reconhece
          concessionárias de todo o Brasil, histórico de 12 meses, grupos
          tarifários e demanda.
        </p>

        {/* Extracted cards grid */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <div
            style={{
              opacity: field1Opacity,
              transform: `translateY(${(1 - field1Opacity) * 20}px)`,
              padding: 16,
              borderRadius: 16,
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={16} color="#10B981" />
              <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>
                Concessionária
              </span>
            </div>
            <div
              style={{
                color: "#FFFFFF",
                fontSize: 20,
                fontWeight: 700,
                marginTop: 6,
              }}
            >
              CEMIG Distribuição
            </div>
            <div style={{ color: "#34D399", fontSize: 12, marginTop: 2 }}>
              Grupo B1 • Trifásico
            </div>
          </div>

          <div
            style={{
              opacity: field2Opacity,
              transform: `translateY(${(1 - field2Opacity) * 20}px)`,
              padding: 16,
              borderRadius: 16,
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={16} color="#10B981" />
              <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>
                Média de Consumo
              </span>
            </div>
            <div
              style={{
                color: "#FFFFFF",
                fontSize: 22,
                fontWeight: 800,
                marginTop: 6,
              }}
            >
              {consumptionVal}{" "}
              <span style={{ fontSize: 15, color: "#94A3B8" }}>kWh/mês</span>
            </div>
            <div style={{ color: "#38BDF8", fontSize: 12, marginTop: 2 }}>
              12 meses consolidados
            </div>
          </div>

          <div
            style={{
              opacity: field3Opacity,
              transform: `translateY(${(1 - field3Opacity) * 20}px)`,
              padding: 16,
              borderRadius: 16,
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={16} color="#10B981" />
              <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>
                Tarifa de Energia
              </span>
            </div>
            <div
              style={{
                color: "#FFFFFF",
                fontSize: 20,
                fontWeight: 700,
                marginTop: 6,
              }}
            >
              R$ 0,98 / kWh
            </div>
            <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>
              TE + TUSD + Ilum. Pública
            </div>
          </div>

          <div
            style={{
              opacity: field4Opacity,
              transform: `translateY(${(1 - field4Opacity) * 20}px)`,
              padding: 16,
              borderRadius: 16,
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={16} color="#F59E0B" />
              <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>
                Tempo de Processamento
              </span>
            </div>
            <div
              style={{
                color: "#34D399",
                fontSize: 20,
                fontWeight: 800,
                marginTop: 6,
              }}
            >
              &lt; 3 Segundos
            </div>
            <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>
              Extração 100% automatizada
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
