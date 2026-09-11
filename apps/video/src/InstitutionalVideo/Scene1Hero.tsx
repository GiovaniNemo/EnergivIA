import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Zap, Sun, Bot, ShieldCheck } from "lucide-react";
import { VideoBrandLogo } from "./BrandLogo";

export const Scene1Hero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring animations
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.6 },
  });

  const contentOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const contentY = interpolate(frame, [10, 35], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const badge1Spring = spring({
    frame: frame - 25,
    fps,
    config: { damping: 14 },
  });

  const badge2Spring = spring({
    frame: frame - 40,
    fps,
    config: { damping: 14 },
  });

  const badge3Spring = spring({
    frame: frame - 55,
    fps,
    config: { damping: 14 },
  });

  const pulseGlow = interpolate(Math.sin(frame / 15), [-1, 1], [0.85, 1.2]);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 100px",
        textAlign: "center",
      }}
    >
      {/* Central Ambient Glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(14, 165, 233, 0.15) 50%, transparent 70%)",
          filter: "blur(60px)",
          transform: `scale(${pulseGlow})`,
          pointerEvents: "none",
        }}
      />

      {/* Hero Logo Card */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          marginBottom: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            padding: "20px 48px",
            borderRadius: 32,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            boxShadow:
              "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(16, 185, 129, 0.25)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <VideoBrandLogo size="lg" showTagline={true} />
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <div
        style={{
          opacity: contentOpacity,
          transform: `translateY(${contentY}px)`,
          maxWidth: 1100,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 24px",
            borderRadius: 999,
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(52, 211, 153, 0.35)",
            color: "#34D399",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          <Sun size={18} />
          <span>Plataforma Definitiva para Integradores Solares</span>
        </div>

        <h1
          style={{
            fontSize: 64,
            fontWeight: 900,
            lineHeight: 1.15,
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
            margin: 0,
          }}
        >
          Feche mais vendas solares com o poder da{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #10B981 0%, #38BDF8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Inteligência Artificial
          </span>
        </h1>

        <p
          style={{
            fontSize: 24,
            lineHeight: 1.5,
            color: "#94A3B8",
            marginTop: 20,
            marginBottom: 44,
            fontWeight: 400,
          }}
        >
          Da leitura da fatura à proposta final no WhatsApp do cliente em menos
          de 2 minutos.
        </p>
      </div>

      {/* Feature Badges Grid */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 24,
          marginTop: 10,
        }}
      >
        <div
          style={{
            transform: `scale(${Math.max(0, badge1Spring)})`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 24px",
            borderRadius: 16,
            background: "rgba(15, 23, 42, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              padding: 10,
              borderRadius: 12,
              background: "rgba(16, 185, 129, 0.2)",
              color: "#34D399",
            }}
          >
            <Bot size={22} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#F8FAFC", fontSize: 16, fontWeight: 700 }}>
              OCR com IA
            </div>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>
              Extração instantânea de faturas
            </div>
          </div>
        </div>

        <div
          style={{
            transform: `scale(${Math.max(0, badge2Spring)})`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 24px",
            borderRadius: 16,
            background: "rgba(15, 23, 42, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              padding: 10,
              borderRadius: 12,
              background: "rgba(14, 165, 233, 0.2)",
              color: "#38BDF8",
            }}
          >
            <Zap size={22} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#F8FAFC", fontSize: 16, fontWeight: 700 }}>
              Dimensionamento Ágil
            </div>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>
              Cálculo de potência e kits em segundos
            </div>
          </div>
        </div>

        <div
          style={{
            transform: `scale(${Math.max(0, badge3Spring)})`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 24px",
            borderRadius: 16,
            background: "rgba(15, 23, 42, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              padding: 10,
              borderRadius: 12,
              background: "rgba(245, 158, 11, 0.2)",
              color: "#FBBF24",
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#F8FAFC", fontSize: 16, fontWeight: 700 }}>
              Operação no WhatsApp
            </div>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>
              Atendimento e envio sem atrito
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
