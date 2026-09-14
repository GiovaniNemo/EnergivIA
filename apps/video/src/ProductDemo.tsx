import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const ProductDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Transições de fase (0-100: Fatura, 95-200: Dimensionamento, 195-300: Proposta)
  const phase1Spring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const phase2Progress = interpolate(frame, [90, 115], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const phase3Progress = interpolate(frame, [190, 215], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Linha de scan da fatura (frames 15 a 85)
  const scanLineY = interpolate(frame, [20, 80], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#070b14",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#ffffff",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Fundo com grade sutil e iluminação de fundo */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 50% 10%, rgba(16, 185, 129, 0.15), transparent 60%), radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.1), transparent 50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.12,
          backgroundImage:
            "linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Janela Principal do Aplicativo */}
      <div
        style={{
          position: "relative",
          width: "1720px",
          height: "960px",
          backgroundColor: "#0b101d",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow:
            "0 30px 80px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(16, 185, 129, 0.12)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transform: `scale(${interpolate(phase1Spring, [0, 1], [0.96, 1])})`,
          opacity: phase1Spring,
        }}
      >
        {/* Topbar da Janela estilo Mac */}
        <div
          style={{
            height: "56px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            backgroundColor: "#0f1629",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                opacity: 0.8,
              }}
            />
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#f59e0b",
                opacity: 0.8,
              }}
            />
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                opacity: 0.8,
              }}
            />
            <span
              style={{
                marginLeft: "16px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#94a3b8",
                letterSpacing: "0.02em",
              }}
            >
              EnergivIA • Fluxo Comercial Inteligente
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 14px",
                borderRadius: "20px",
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                  boxShadow: "0 0 8px #10b981",
                }}
              />
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#6ee7b7",
                  letterSpacing: "0.03em",
                }}
              >
                {frame < 95
                  ? "ETAPA 1: LEITURA DA CONTA"
                  : frame < 195
                    ? "ETAPA 2: DIMENSIONAMENTO DO SISTEMA"
                    : "ETAPA 3: PROPOSTA EXECUTIVA GERADA"}
              </span>
            </div>
          </div>
        </div>

        {/* Corpo da Aplicação */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "400px 1fr",
            backgroundColor: "#080c16",
          }}
        >
          {/* Barra Lateral do Sistema */}
          <div
            style={{
              borderRight: "1px solid rgba(255, 255, 255, 0.08)",
              backgroundColor: "#0a0e1a",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "8px",
                }}
              >
                Cliente / Projeto
              </div>
              <div
                style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc" }}
              >
                Condomínio Residencial Santana
              </div>
              <div
                style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}
              >
                São Paulo - SP • Tarifa B1 Residencial
              </div>
            </div>

            {/* Checklist de Processamento */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                marginTop: "10px",
              }}
            >
              <StepItem
                active={frame >= 10}
                done={frame >= 85}
                title="Leitura da Fatura (PDF / Foto)"
                subtitle="Extração instantânea de consumo e tarifas"
              />
              <StepItem
                active={frame >= 90}
                done={frame >= 185}
                title="Dimensionamento Fotovoltaico"
                subtitle="Cálculo de kWp, módulos e inversor ideal"
              />
              <StepItem
                active={frame >= 190}
                done={frame >= 280}
                title="Proposta Comercial Pronta"
                subtitle="PDF executivo e envio direto por WhatsApp"
              />
            </div>

            {/* Card de Resumo Rápido */}
            <div
              style={{
                marginTop: "auto",
                padding: "20px",
                borderRadius: "14px",
                backgroundColor: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#94a3b8",
                  marginBottom: "6px",
                }}
              >
                Economia Estimada em 25 anos
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#10b981",
                  letterSpacing: "-0.02em",
                }}
              >
                R$ 284.500,00
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  marginTop: "4px",
                }}
              >
                Payback estimado em 3 anos e 2 meses
              </div>
            </div>
          </div>

          {/* Área Central Interativa com as 3 Etapas */}
          <div
            style={{
              position: "relative",
              padding: "36px",
              overflow: "hidden",
            }}
          >
            {/* ETAPA 1: Fatura de Energia e Scanner (Frames 0 a 105) */}
            <div
              style={{
                position: "absolute",
                inset: "36px",
                opacity: 1 - phase2Progress,
                transform: `translateY(${interpolate(phase2Progress, [0, 1], [0, -30])}px) scale(${interpolate(phase2Progress, [0, 1], [1, 0.96])})`,
                pointerEvents: frame >= 105 ? "none" : "auto",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "32px",
                alignItems: "center",
              }}
            >
              {/* Card da Fatura Visual */}
              <div
                style={{
                  height: "720px",
                  backgroundColor: "#0e1526",
                  borderRadius: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  padding: "28px",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
                }}
              >
                {/* Linha de Scanner que corre a fatura */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: `${scanLineY}%`,
                    height: "3px",
                    background:
                      "linear-gradient(90deg, transparent, #10b981, #06b6d4, transparent)",
                    boxShadow: "0 0 16px 2px #10b981",
                    zIndex: 10,
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    paddingBottom: "16px",
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#38bdf8",
                        letterSpacing: "0.05em",
                      }}
                    >
                      FATURA DE ENERGIA ELÉTRICA
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Concessionária: CPFL Paulista
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(56, 189, 248, 0.15)",
                      color: "#38bdf8",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    OCR ATIVO
                  </span>
                </div>

                {/* Linhas Simuladas da Fatura */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <InvoiceField
                    label="Código do Cliente / Instalação"
                    value="7029184022"
                    highlighted={frame >= 25}
                  />
                  <InvoiceField
                    label="Consumo Médio Últimos 12 Meses"
                    value="780 kWh / mês"
                    highlighted={frame >= 40}
                  />
                  <InvoiceField
                    label="Tipo de Conexão"
                    value="Bifásica (220V)"
                    highlighted={frame >= 55}
                  />
                  <InvoiceField
                    label="Valor Total da Fatura"
                    value="R$ 845,60"
                    highlighted={frame >= 70}
                  />
                </div>

                {/* Histórico Simulado em Gráfico */}
                <div style={{ marginTop: "28px" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#64748b",
                      marginBottom: "12px",
                    }}
                  >
                    Histórico de Consumo (kWh)
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: "10px",
                      height: "120px",
                      paddingBottom: "8px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    {[
                      650, 720, 810, 790, 840, 780, 800, 750, 820, 770, 790,
                      780,
                    ].map((val, idx) => (
                      <div
                        key={idx}
                        style={{
                          flex: 1,
                          backgroundColor:
                            idx >= 8 ? "#10b981" : "rgba(255, 255, 255, 0.2)",
                          borderRadius: "4px 4px 0 0",
                          height: `${(val / 900) * 100}%`,
                          transition: "all 0.3s",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Informações Extraídas com Badges Fluídos */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                  }}
                >
                  Extração precisa sem digitação manual
                </div>
                <p
                  style={{
                    fontSize: "16px",
                    color: "#94a3b8",
                    lineHeight: 1.6,
                  }}
                >
                  A plataforma analisa instantaneamente histórico de consumo,
                  tarifa de energia, concessionária e grupo tarifário para
                  fundamentar a engenharia e o retorno financeiro.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "14px",
                  }}
                >
                  <DataMetricCard
                    title="Consumo Médio"
                    value="780 kWh"
                    active={frame >= 40}
                  />
                  <DataMetricCard
                    title="Tarifa com Tributos"
                    value="R$ 1,08 / kWh"
                    active={frame >= 50}
                  />
                  <DataMetricCard
                    title="Conexão"
                    value="Bifásico"
                    active={frame >= 60}
                  />
                  <DataMetricCard
                    title="Disponibilidade"
                    value="50 kWh"
                    active={frame >= 70}
                  />
                </div>
              </div>
            </div>

            {/* ETAPA 2: Dimensionamento Fotovoltaico (Frames 90 a 205) */}
            <div
              style={{
                position: "absolute",
                inset: "36px",
                opacity:
                  frame < 90
                    ? 0
                    : frame < 195
                      ? phase2Progress
                      : 1 - phase3Progress,
                transform: `translateY(${
                  frame < 95
                    ? (1 - phase2Progress) * 30
                    : frame >= 195
                      ? phase3Progress * -30
                      : 0
                }px)`,
                pointerEvents: frame < 95 || frame >= 205 ? "none" : "auto",
                display: "flex",
                flexDirection: "column",
                gap: "28px",
                justifyContent: "center",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#10b981",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Dimensionamento Automático
                </span>
                <h2
                  style={{
                    fontSize: "32px",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    marginTop: "6px",
                  }}
                >
                  Potência exata com kit ideal pré-selecionado
                </h2>
              </div>

              {/* Grid de 3 Cards Técnicos */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "24px",
                }}
              >
                <TechSpecCard
                  badge="POTÊNCIA DO GERADOR"
                  highlight="6,90 kWp"
                  detail="Geração de 840 kWh/mês"
                  sub="108% de cobertura da fatura"
                  color="#10b981"
                />
                <TechSpecCard
                  badge="MÓDULOS FOTOVOLTAICOS"
                  highlight="12x Painéis 575W"
                  detail="Tecnologia N-Type Bifacial"
                  sub="Área estimada: 32 m²"
                  color="#38bdf8"
                />
                <TechSpecCard
                  badge="INVERSOR SOLAR"
                  highlight="1x Inversor 6kW"
                  detail="2 MPPTs Independentes"
                  sub="Eficiência máxima 98.4%"
                  color="#a855f7"
                />
              </div>

              {/* Tabela Comparativa de Opções de Kits */}
              <div
                style={{
                  backgroundColor: "#0e1526",
                  borderRadius: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  padding: "24px",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#cbd5e1",
                    marginBottom: "16px",
                  }}
                >
                  Opções de Kits Configuradas para a Região
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <KitRow
                    type="Custo-Benefício"
                    brand="Módulos DAH 575W + Inversor Deye 6kW"
                    price="R$ 21.800,00"
                    selected={true}
                  />
                  <KitRow
                    type="Premium"
                    brand="Módulos Canadian 580W + Inversor Growatt 6kW"
                    price="R$ 24.500,00"
                    selected={false}
                  />
                  <KitRow
                    type="Econômico"
                    brand="Módulos OSDA 570W + Inversor Solis 6kW"
                    price="R$ 19.900,00"
                    selected={false}
                  />
                </div>
              </div>
            </div>

            {/* ETAPA 3: Proposta Comercial Executiva (Frames 190 a 300) */}
            <div
              style={{
                position: "absolute",
                inset: "36px",
                opacity: frame < 190 ? 0 : phase3Progress,
                transform: `translateY(${(1 - phase3Progress) * 30}px)`,
                pointerEvents: frame < 190 ? "none" : "auto",
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: "36px",
                alignItems: "center",
              }}
            >
              {/* Prévia da Proposta Comercial Real */}
              <div
                style={{
                  height: "720px",
                  backgroundColor: "#0d1424",
                  borderRadius: "18px",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  boxShadow:
                    "0 25px 60px -10px rgba(0, 0, 0, 0.7), 0 0 35px rgba(16, 185, 129, 0.15)",
                  padding: "32px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  {/* Cabeçalho da Proposta */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                      paddingBottom: "20px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: 800,
                          color: "#ffffff",
                        }}
                      >
                        PROPOSTA TÉCNICA E COMERCIAL
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#94a3b8",
                          marginTop: "4px",
                        }}
                      >
                        Preparada para: Condomínio Santana
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "6px 14px",
                        borderRadius: "8px",
                        backgroundColor: "#10b981",
                        color: "#022c22",
                        fontWeight: 700,
                        fontSize: "12px",
                      }}
                    >
                      PRONTA PARA ENVIO
                    </div>
                  </div>

                  {/* Resumo Financeiro da Proposta */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "16px",
                      marginTop: "24px",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#090d16",
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        Investimento Total
                      </div>
                      <div
                        style={{
                          fontSize: "24px",
                          fontWeight: 800,
                          color: "#ffffff",
                          marginTop: "4px",
                        }}
                      >
                        R$ 28.900,00
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#10b981",
                          marginTop: "4px",
                        }}
                      >
                        Em até 60x de R$ 689,00
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: "#090d16",
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        Economia no 1º Ano
                      </div>
                      <div
                        style={{
                          fontSize: "24px",
                          fontWeight: 800,
                          color: "#10b981",
                          marginTop: "4px",
                        }}
                      >
                        R$ 9.840,00
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#38bdf8",
                          marginTop: "4px",
                        }}
                      >
                        Payback em 3,2 anos
                      </div>
                    </div>
                  </div>

                  {/* Lista de Itens do Projeto */}
                  <div
                    style={{
                      marginTop: "24px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <ProposalBullet text="Sistema Solar Fotovoltaico Conectado à Rede (On-Grid) de 6,90 kWp" />
                    <ProposalBullet text="Módulos N-Type Bifaciais de Alta Eficiência com 25 anos de garantia" />
                    <ProposalBullet text="Inversor String Inteligente com Monitoramento via Aplicativo Wi-Fi" />
                    <ProposalBullet text="Engenharia, Homologação junto à CPFL e Instalação Completa" />
                  </div>
                </div>

                {/* Botão de Envio no WhatsApp */}
                <div
                  style={{
                    backgroundColor: "#064e3b",
                    border: "1px solid #10b981",
                    borderRadius: "14px",
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        backgroundColor: "#10b981",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#022c22",
                        fontWeight: 800,
                        fontSize: "18px",
                      }}
                    >
                      ✓
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#ffffff",
                        }}
                      >
                        Disponível para Envio Imediato
                      </div>
                      <div style={{ fontSize: "12px", color: "#a7f3d0" }}>
                        PDF personalizado com a marca da sua empresa
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      backgroundColor: "#10b981",
                      color: "#022c22",
                      fontSize: "12px",
                      fontWeight: 800,
                      letterSpacing: "0.02em",
                    }}
                  >
                    ENVIAR NO WHATSAPP
                  </div>
                </div>
              </div>

              {/* Texto de Impacto da Proposta */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#10b981",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Velocidade e Conversão
                </span>
                <h2
                  style={{
                    fontSize: "36px",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                  }}
                >
                  Apresentação executiva pronta em menos de 2 minutos
                </h2>
                <p
                  style={{
                    fontSize: "16px",
                    color: "#94a3b8",
                    lineHeight: 1.6,
                  }}
                >
                  Entregue uma proposta completa com a identidade visual da sua
                  integradora, análise de viabilidade financeira, fluxo de caixa
                  e comparativo antes/depois. Tudo direto no canal em que o
                  cliente toma a decisão.
                </p>

                <div style={{ display: "flex", gap: "16px" }}>
                  <div
                    style={{
                      padding: "12px 18px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#e2e8f0",
                    }}
                  >
                    PDF Executivo
                  </div>
                  <div
                    style={{
                      padding: "12px 18px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#e2e8f0",
                    }}
                  >
                    Link Interativo
                  </div>
                  <div
                    style={{
                      padding: "12px 18px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#6ee7b7",
                    }}
                  >
                    Envio por WhatsApp
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Componentes Auxiliares
const StepItem: React.FC<{
  active: boolean;
  done: boolean;
  title: string;
  subtitle: string;
}> = ({ active, done, title, subtitle }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      opacity: active ? 1 : 0.4,
      transition: "all 0.3s",
    }}
  >
    <div
      style={{
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        backgroundColor: done
          ? "#10b981"
          : active
            ? "rgba(16, 185, 129, 0.2)"
            : "#1e293b",
        border: done
          ? "none"
          : active
            ? "2px solid #10b981"
            : "1px solid #334155",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#022c22",
        fontSize: "12px",
        fontWeight: 700,
        marginTop: "2px",
      }}
    >
      {done ? "✓" : ""}
    </div>
    <div>
      <div style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}>
        {title}
      </div>
      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
        {subtitle}
      </div>
    </div>
  </div>
);

const InvoiceField: React.FC<{
  label: string;
  value: string;
  highlighted: boolean;
}> = ({ label, value, highlighted }) => (
  <div
    style={{
      padding: "12px 16px",
      borderRadius: "8px",
      backgroundColor: highlighted
        ? "rgba(16, 185, 129, 0.12)"
        : "rgba(255, 255, 255, 0.03)",
      border: highlighted
        ? "1px solid rgba(16, 185, 129, 0.4)"
        : "1px solid rgba(255, 255, 255, 0.05)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      transition: "all 0.3s",
    }}
  >
    <span style={{ fontSize: "13px", color: "#94a3b8" }}>{label}</span>
    <span
      style={{
        fontSize: "14px",
        fontWeight: 700,
        color: highlighted ? "#34d399" : "#ffffff",
      }}
    >
      {value}
    </span>
  </div>
);

const DataMetricCard: React.FC<{
  title: string;
  value: string;
  active: boolean;
}> = ({ title, value, active }) => (
  <div
    style={{
      padding: "16px",
      borderRadius: "12px",
      backgroundColor: "#0f172a",
      border: active
        ? "1px solid rgba(16, 185, 129, 0.3)"
        : "1px solid rgba(255, 255, 255, 0.06)",
      opacity: active ? 1 : 0.3,
      transform: active ? "scale(1)" : "scale(0.97)",
      transition: "all 0.3s",
    }}
  >
    <div
      style={{
        fontSize: "11px",
        color: "#64748b",
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      {title}
    </div>
    <div
      style={{
        fontSize: "20px",
        fontWeight: 800,
        color: "#ffffff",
        marginTop: "6px",
      }}
    >
      {value}
    </div>
  </div>
);

const TechSpecCard: React.FC<{
  badge: string;
  highlight: string;
  detail: string;
  sub: string;
  color: string;
}> = ({ badge, highlight, detail, sub, color }) => (
  <div
    style={{
      padding: "24px",
      borderRadius: "16px",
      backgroundColor: "#0e1526",
      border: `1px solid ${color}33`,
      boxShadow: `0 10px 30px -5px ${color}15`,
    }}
  >
    <span
      style={{
        fontSize: "11px",
        fontWeight: 700,
        color: color,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {badge}
    </span>
    <div
      style={{
        fontSize: "26px",
        fontWeight: 800,
        color: "#ffffff",
        margin: "12px 0 6px 0",
      }}
    >
      {highlight}
    </div>
    <div style={{ fontSize: "14px", fontWeight: 600, color: "#cbd5e1" }}>
      {detail}
    </div>
    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
      {sub}
    </div>
  </div>
);

const KitRow: React.FC<{
  type: string;
  brand: string;
  price: string;
  selected: boolean;
}> = ({ type, brand, price, selected }) => (
  <div
    style={{
      padding: "14px 18px",
      borderRadius: "10px",
      backgroundColor: selected
        ? "rgba(16, 185, 129, 0.12)"
        : "rgba(255, 255, 255, 0.02)",
      border: selected
        ? "1px solid #10b981"
        : "1px solid rgba(255, 255, 255, 0.05)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <div
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          border: selected ? "5px solid #10b981" : "2px solid #64748b",
          backgroundColor: "#0b101d",
        }}
      />
      <div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: selected ? "#34d399" : "#94a3b8",
            textTransform: "uppercase",
          }}
        >
          {type}
        </span>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>
          {brand}
        </div>
      </div>
    </div>
    <div
      style={{
        fontSize: "15px",
        fontWeight: 700,
        color: selected ? "#34d399" : "#cbd5e1",
      }}
    >
      {price}
    </div>
  </div>
);

const ProposalBullet: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <div
      style={{
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        backgroundColor: "#10b981",
      }}
    />
    <span style={{ fontSize: "13px", color: "#cbd5e1" }}>{text}</span>
  </div>
);
