import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ArrowRight, Check, Globe } from "lucide-react";
import { VideoBrandLogo } from "./BrandLogo";

export const Scene6CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.6 },
  });

  const contentOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const buttonPulse = interpolate(Math.sin(frame / 12), [-1, 1], [1, 1.05]);

  const statsSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 14 },
  });

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
      {/* Central Glow */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(14, 165, 233, 0.15) 50%, transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      {/* Proof Stats Grid */}
      <div
        style={{
          transform: `scale(${Math.max(0, statsSpring)})`,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 20,
          width: "100%",
          maxWidth: 960,
          marginBottom: 44,
        }}
      >
        {[
          { val: "< 2 min", label: "Para gerar proposta completa" },
          { val: "3 passos", label: "Da conta de luz ao PDF final" },
          { val: "1 fluxo", label: "Chat, kit e proposta no WhatsApp" },
          { val: "+40%", label: "Mais conversão de vendas" },
        ].map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: "18px 16px",
              borderRadius: 18,
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: idx === 3 ? "#34D399" : "#FFFFFF",
              }}
            >
              {item.val}
            </div>
            <div style={{ color: "#94A3B8", fontSize: 13, marginTop: 4 }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Main Logo & Call to Action */}
      <div
        style={{
          transform: `scale(${logoSpring})`,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            padding: "16px 36px",
            borderRadius: 24,
            background: "rgba(15, 23, 42, 0.7)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            display: "inline-flex",
            boxShadow: "0 0 30px rgba(16, 185, 129, 0.25)",
          }}
        >
          <VideoBrandLogo size="md" showTagline={true} />
        </div>
      </div>

      <div
        style={{
          opacity: contentOpacity,
          maxWidth: 900,
        }}
      >
        <h2
          style={{
            fontSize: 48,
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
            margin: "0 0 16px 0",
          }}
        >
          Transforme sua operação de energia solar hoje mesmo.
        </h2>

        <p
          style={{
            fontSize: 22,
            color: "#94A3B8",
            margin: "0 0 32px 0",
          }}
        >
          Junte-se a integradores em todo o Brasil que já operam com a
          inteligência da EnergivIA.
        </p>

        {/* Big CTA Button */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            padding: "18px 44px",
            borderRadius: 999,
            background: "linear-gradient(90deg, #10B981, #059669)",
            color: "#022c22",
            fontSize: 22,
            fontWeight: 800,
            boxShadow:
              "0 0 35px rgba(16, 185, 129, 0.6), 0 10px 25px rgba(0,0,0,0.5)",
            transform: `scale(${buttonPulse})`,
            cursor: "pointer",
          }}
        >
          <Globe size={24} />
          <span>Acesse: energivia.com.br</span>
          <ArrowRight size={24} />
        </div>

        {/* Benefits underneath CTA */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 32,
            marginTop: 24,
            color: "#94A3B8",
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={18} color="#34D399" />
            Configuração em 2 minutos
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={18} color="#34D399" />
            Sem cartão de crédito inicial
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={18} color="#34D399" />
            Cancele quando quiser
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
