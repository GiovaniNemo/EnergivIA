import React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { MessageSquare, CheckCheck, Send, Kanban } from "lucide-react";

export const Scene4WhatsAppCRM: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  // Chat messages entrance
  const msg1Scale = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14 },
  });

  const msg2Scale = spring({
    frame: frame - 35,
    fps,
    config: { damping: 14 },
  });

  const msg3Scale = spring({
    frame: frame - 60,
    fps,
    config: { damping: 14 },
  });

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
      {/* Left side: WhatsApp Chat Simulator Mockup */}
      <div
        style={{
          flex: 1,
          maxWidth: 460,
          transform: `scale(${enterSpring})`,
          background: "#0b141a",
          borderRadius: 28,
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow:
            "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(37, 211, 102, 0.15)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: 520,
        }}
      >
        {/* WhatsApp Header */}
        <div
          style={{
            background: "#1f2c34",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #10B981, #0EA5E9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFF",
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            E
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#E9EDEF", fontSize: 16, fontWeight: 700 }}>
              Assistente EnergivIA
            </div>
            <div
              style={{
                color: "#25D366",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "#25D366",
                }}
              />
              Online • IA Comercial
            </div>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div
          style={{
            flex: 1,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            background:
              "radial-gradient(circle at center, #111b21 0%, #0b141a 100%)",
          }}
        >
          {/* Customer message */}
          <div
            style={{
              transform: `scale(${Math.max(0, msg1Scale)})`,
              alignSelf: "flex-end",
              background: "#005c4b",
              color: "#E9EDEF",
              padding: "12px 16px",
              borderRadius: "16px 16px 4px 16px",
              maxWidth: "85%",
              fontSize: 14,
              lineHeight: 1.4,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            Olá! Enviei a foto da minha conta de luz para fazer uma simulação.
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
                color: "#8696a0",
                fontSize: 11,
              }}
            >
              14:20 <CheckCheck size={14} color="#53bdeb" />
            </div>
          </div>

          {/* AI Bot message 1 */}
          <div
            style={{
              transform: `scale(${Math.max(0, msg2Scale)})`,
              alignSelf: "flex-start",
              background: "#202c33",
              color: "#E9EDEF",
              padding: "12px 16px",
              borderRadius: "16px 16px 16px 4px",
              maxWidth: "90%",
              fontSize: 14,
              lineHeight: 1.4,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            ⚡ <strong>Conta analisada com sucesso!</strong>
            <br />
            Identificamos um consumo de <strong>845 kWh/mês</strong>.
            <br />
            Dimensionamos um sistema de <strong>7.2 kWp</strong>.
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
                color: "#8696a0",
                fontSize: 11,
              }}
            >
              14:20
            </div>
          </div>

          {/* AI Bot message 2 (Proposal Card) */}
          <div
            style={{
              transform: `scale(${Math.max(0, msg3Scale)})`,
              alignSelf: "flex-start",
              background: "#202c33",
              borderRadius: "16px 16px 16px 4px",
              maxWidth: "92%",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              overflow: "hidden",
              boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                background: "linear-gradient(90deg, #10B981, #0EA5E9)",
                padding: "8px 14px",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              📄 Proposta Solar Pronta!
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ color: "#E9EDEF", fontSize: 13, fontWeight: 600 }}>
                Economia Anual Estimada:{" "}
                <span style={{ color: "#34D399" }}>R$ 9.850,00</span>
              </div>
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  backgroundColor: "#00a884",
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                Abrir Proposta Personalizada
              </div>
            </div>
          </div>
        </div>

        {/* Mock input footer */}
        <div
          style={{
            background: "#1f2c34",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              flex: 1,
              background: "#2a3942",
              borderRadius: 20,
              padding: "8px 16px",
              color: "#8696a0",
              fontSize: 13,
            }}
          >
            Mensagem automatizada via IA...
          </div>
          <div
            style={{
              padding: 8,
              borderRadius: "50%",
              background: "#00a884",
              color: "#FFF",
            }}
          >
            <Send size={16} />
          </div>
        </div>
      </div>

      {/* Right side: CRM Pipeline & Value Props */}
      <div style={{ flex: 1.2, maxWidth: 620 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 999,
            background: "rgba(37, 211, 102, 0.15)",
            border: "1px solid rgba(37, 211, 102, 0.35)",
            color: "#25D366",
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          <MessageSquare size={16} />
          <span>Atendimento & Vendas no WhatsApp</span>
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
          Seu cliente no WhatsApp.{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #25D366 0%, #38BDF8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Sua equipe fechando contratos.
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
          O fluxo inteiro acontece no canal onde o cliente já está: coleta da
          conta, análise por IA, envio da simulação e acompanhamento automático
          no seu CRM.
        </p>

        {/* CRM Mini Kanban Preview */}
        <div
          style={{
            background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
            borderRadius: 20,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Kanban size={18} color="#38BDF8" />
              <span style={{ color: "#FFFFFF", fontSize: 14, fontWeight: 700 }}>
                Pipeline de Vendas em Tempo Real
              </span>
            </div>
            <span style={{ color: "#34D399", fontSize: 12, fontWeight: 600 }}>
              +300% de Velocidade de Resposta
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
            }}
          >
            <div
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                borderRadius: 12,
                padding: 12,
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 600 }}>
                1. Conta Recebida
              </div>
              <div
                style={{
                  marginTop: 8,
                  padding: 8,
                  borderRadius: 8,
                  background: "#1e293b",
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Lead: Dr. Carlos
                <div style={{ color: "#64748B", fontSize: 11 }}>
                  845 kWh/mês
                </div>
              </div>
            </div>

            <div
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                borderRadius: 12,
                padding: 12,
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              <div style={{ color: "#34D399", fontSize: 12, fontWeight: 600 }}>
                2. Proposta Enviada
              </div>
              <div
                style={{
                  marginTop: 8,
                  padding: 8,
                  borderRadius: 8,
                  background: "#1e293b",
                  borderLeft: "3px solid #10B981",
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Lead: Supermercado Sol
                <div style={{ color: "#34D399", fontSize: 11 }}>
                  R$ 48.900,00
                </div>
              </div>
            </div>

            <div
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                borderRadius: 12,
                padding: 12,
                border: "1px solid rgba(14, 165, 233, 0.2)",
              }}
            >
              <div style={{ color: "#38BDF8", fontSize: 12, fontWeight: 600 }}>
                3. Fechado / Contrato
              </div>
              <div
                style={{
                  marginTop: 8,
                  padding: 8,
                  borderRadius: 8,
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                  color: "#34D399",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                ✓ Venda Concluída
                <div style={{ color: "#E2E8F0", fontSize: 11 }}>
                  Contrato Assinado
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
