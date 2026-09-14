"use client";

import React, { useEffect, useRef, useState } from "react";
import { PreviewDocument } from "@/components/proposals/editor/preview-document";
import type {
  ProposalDocumentJson,
  ProposalSection,
  SectionType,
} from "@/components/proposals/editor/types";
import { createId } from "@/components/proposals/editor/utils";

export type ProposalMockType = "residential" | "commercial" | "usinas" | "industrial" | "whatsapp";

interface MockProposalPreviewProps {
  type: ProposalMockType;
  clientName?: string;
  compact?: boolean;
  className?: string;
}

// -----------------------------------------------------------------------------
// HELPER PARA CRIAR SEÇÕES DO TEMPLATE DA PLATAFORMA
// -----------------------------------------------------------------------------
function makeSection(
  type: SectionType,
  variant: string,
  title: string,
  content: string,
  fields: Record<string, unknown>
): ProposalSection {
  return {
    id: createId(),
    type,
    variant,
    title,
    content,
    fields,
    hidden: false,
  };
}

// -----------------------------------------------------------------------------
// 1. TEMPLATE RESIDENCIAL DA PLATAFORMA
// -----------------------------------------------------------------------------
function createResidentialProposalDocument(clientName = "Família Santana"): ProposalDocumentJson {
  return {
    styles: {
      branding: {
        logoUrl: "",
        primaryColor: "#059669",
        secondaryColor: "#10B981",
        backgroundColor: "#061A14",
        textColor: "#F8FAFC",
      },
      typography: {
        fontFamily: "Inter",
        titleSize: 30,
        subtitleSize: 18,
        bodySize: 14,
        preset: "medium",
      },
      layout: {
        pageWidth: "medium",
        spacing: "normal",
        borderRadius: 16,
        shadowIntensity: 4,
      },
      cover: {
        imageUrl: "",
        overlayColor: "#022c22",
        overlayOpacity: 35,
        titleText: "Proposta de Energia Solar Fotovoltaica",
        showLogo: false,
      },
      footer: {
        companyName: "EnergivIA Soluções Solares",
        contactInfo: "contato@energivia.com.br | (11) 99999-8888",
        showPageNumbers: true,
      },
    },
    variables: {
      nome_cliente: clientName,
      nome_empresa: "EnergivIA",
      data_proposta: new Date().toLocaleDateString("pt-BR"),
      tamanho_sistema_kw: "5.5 kWp",
      potencia_sistema_kwp: 5.5,
      geracao_mensal_kwh: 715,
      cobertura_consumo_pct: 92,
      conta_mensal_energia: 740,
      taxa_reajuste_anual: "8",
      economia_mensal: "R$ 680,00",
      payback_anos: "2,8 anos",
      investimento_total: "R$ 18.900,00",
      producao_anual: "8.580 kWh/ano",
    },
    sections: [
      makeSection("cover", "card-overlay", "Capa", "", {
        title: "Proposta de Energia Solar Fotovoltaica",
        subtitle: `<p>Preparado com inteligência artificial para <strong>${clientName}</strong></p>`,
        highlight: "Residencial Express",
        alignment: "center",
        showCompanyName: true,
        companyNamePlacement: "header",
        companyNameAlign: "center",
        showLogo: false,
        backgroundColor: "#064e3b",
        overlayColor: "#022c22",
        overlayOpacity: 40,
        textColor: "#FFFFFF",
      }),
      makeSection(
        "diagnostic_energy",
        "cards",
        "Diagnóstico do Cenário Atual",
        "<p>Analisamos seu histórico de consumo e identificamos um potencial de redução imediata de até 92% na sua conta.</p>",
        {
          title: "Diagnóstico Energético",
          text: "<p>Com base na sua fatura média de R$ 740,00, a transição para energia solar garante proteção total contra aumentos tarifários.</p>",
          painPoints: [
            { text: "Conta de luz média de R$ 740/mês", icon: "trending-up" },
            { text: "Dependência total da tarifa da concessionária", icon: "plug" },
            { text: "Gastos projetados de R$ 52.000 em 5 anos sem solar", icon: "alert-circle" },
          ],
          impact: [
            { text: "Redução de até 92% na fatura mensal", icon: "dollar-sign" },
            { text: "Economia garantida desde o 1º mês", icon: "zap" },
            { text: "Valorização imediata do imóvel", icon: "home" },
          ],
          highlightText: "Economia mensal estimada de R$ 680,00 com retorno em 2,8 anos.",
          highlightIcon: "zap",
        }
      ),
      makeSection(
        "solution",
        "cards",
        "Solução Fotovoltaica",
        "<p>Sistema de geração distribuída dimensionado exatamente para a sua necessidade residencial.</p>",
        {
          title: "Solução Recomendada",
          solutionName: "Gerador Solar On-Grid 5.5 kWp",
          text: "<p>Composto por 10 módulos monocristalinos de alta eficiência de 550W e inversor de última geração com monitoramento via app.</p>",
          benefits: [
            { id: "b1", text: "Geração estimada de 715 kWh/mês", icon: "sun" },
            { id: "b2", text: "Garantia de 25 anos nos painéis solares", icon: "shield" },
            { id: "b3", text: "Aplicativo de monitoramento em tempo real", icon: "smartphone" },
          ],
        }
      ),
      makeSection(
        "pricing",
        "compact",
        "Investimento e Condições",
        "<p>Condições facilitadas com opções à vista ou financiamento com parcelas menores que a economia.</p>",
        {
          title: "Condições Comerciais",
          paymentConditions: "À vista com 5% de desconto ou em até 60x de R$ 425,00.",
        }
      ),
    ],
  };
}

// -----------------------------------------------------------------------------
// 2. TEMPLATE COMERCIAL DA PLATAFORMA
// -----------------------------------------------------------------------------
function createCommercialProposalDocument(clientName = "Mercado Central"): ProposalDocumentJson {
  return {
    styles: {
      branding: {
        logoUrl: "",
        primaryColor: "#0284C7",
        secondaryColor: "#38BDF8",
        backgroundColor: "#081A2A",
        textColor: "#F8FAFC",
      },
      typography: {
        fontFamily: "Inter",
        titleSize: 30,
        subtitleSize: 18,
        bodySize: 14,
        preset: "medium",
      },
      layout: {
        pageWidth: "medium",
        spacing: "normal",
        borderRadius: 16,
        shadowIntensity: 4,
      },
      cover: {
        imageUrl: "",
        overlayColor: "#082f49",
        overlayOpacity: 45,
        titleText: "Estudo de Eficiência Energética & Tarifa B3",
        showLogo: false,
      },
      footer: {
        companyName: "EnergivIA Comercial",
        contactInfo: "empresas@energivia.com.br",
        showPageNumbers: true,
      },
    },
    variables: {
      nome_cliente: clientName,
      nome_empresa: "EnergivIA",
      data_proposta: new Date().toLocaleDateString("pt-BR"),
      tamanho_sistema_kw: "34.2 kWp",
      potencia_sistema_kwp: 34.2,
      geracao_mensal_kwh: 4400,
      cobertura_consumo_pct: 88,
      conta_mensal_energia: 5200,
      taxa_reajuste_anual: "8",
      economia_mensal: "R$ 4.350,00",
      payback_anos: "2,3 anos",
      investimento_total: "R$ 118.000,00",
      producao_anual: "52.800 kWh/ano",
    },
    sections: [
      makeSection("cover", "hero-cinematic", "Capa", "", {
        title: "Estudo de Viabilidade & Eficiência Solar",
        subtitle: `<p>Elaborado para otimização de custos operacionais de <strong>${clientName}</strong></p>`,
        highlight: "Comercial · Tarifa B3",
        alignment: "center",
        showCompanyName: true,
        companyNamePlacement: "header",
        companyNameAlign: "center",
        showLogo: false,
        backgroundColor: "#0c4a6e",
        overlayColor: "#082f49",
        overlayOpacity: 45,
        textColor: "#FFFFFF",
      }),
      makeSection(
        "diagnostic_energy",
        "cards",
        "Análise Tarifária e OPEX",
        "<p>Otimização de custos fixos com migração de consumo e geração própria no padrão comercial B3.</p>",
        {
          title: "Diagnóstico Comercial B3",
          text: "<p>Redução agressiva no centro de custos de energia com retorno acelerado do capital investido.</p>",
          painPoints: [
            { text: "Custo anual com energia superior a R$ 62.000", icon: "trending-up" },
            { text: "Impacto da inflação energética na margem de lucro", icon: "alert-circle" },
            { text: "Incerteza de custos no orçamento anual", icon: "wallet" },
          ],
          impact: [
            { text: "Economia anual estimada em R$ 52.200,00", icon: "dollar-sign" },
            { text: "TIR do projeto de 38,4% ao ano", icon: "trending-up" },
            { text: "Mais de R$ 1,6 milhão economizados em 25 anos", icon: "bar-chart-3" },
          ],
          highlightText: "Payback comercial projetado em apenas 2,3 anos com TIR de 38,4% a.a.",
          highlightIcon: "trending-up",
        }
      ),
      makeSection(
        "solution",
        "cards",
        "Arquitetura do Sistema",
        "<p>Usina solar de 34.2 kWp projetada para suportar a carga de refrigeração e iluminação comercial.</p>",
        {
          title: "Arquitetura Técnica",
          solutionName: "Usina Solar Comercial 34.2 kWp",
          text: "<p>Composta por 62 módulos solares Tier 1 e inversor trifásico de 30kW com proteção integrada anti-ilhamento.</p>",
          benefits: [
            { id: "c1", text: "Geração de 52.800 kWh anuais", icon: "sun" },
            { id: "c2", text: "Inversor comercial com telemetria inteligente", icon: "shield" },
            { id: "c3", text: "Depreciação acelerada e benefício fiscal", icon: "building-2" },
          ],
        }
      ),
    ],
  };
}

// -----------------------------------------------------------------------------
// 3. TEMPLATE USINAS & INDUSTRIAL DA PLATAFORMA
// -----------------------------------------------------------------------------
function createUsinasProposalDocument(clientName = "Fábrica Horizonte"): ProposalDocumentJson {
  return {
    styles: {
      branding: {
        logoUrl: "",
        primaryColor: "#7C3AED",
        secondaryColor: "#A855F7",
        backgroundColor: "#110D20",
        textColor: "#F8FAFC",
      },
      typography: {
        fontFamily: "Inter",
        titleSize: 30,
        subtitleSize: 18,
        bodySize: 14,
        preset: "medium",
      },
      layout: {
        pageWidth: "medium",
        spacing: "normal",
        borderRadius: 16,
        shadowIntensity: 4,
      },
      cover: {
        imageUrl: "",
        overlayColor: "#3b0764",
        overlayOpacity: 45,
        titleText: "Usina de Solo & Autoconsumo Remoto",
        showLogo: false,
      },
      footer: {
        companyName: "EnergivIA Projetos Especiais",
        contactInfo: "engenharia@energivia.com.br",
        showPageNumbers: true,
      },
    },
    variables: {
      nome_cliente: clientName,
      nome_empresa: "EnergivIA",
      data_proposta: new Date().toLocaleDateString("pt-BR"),
      tamanho_sistema_kw: "185 kWp",
      potencia_sistema_kwp: 185,
      geracao_mensal_kwh: 24500,
      cobertura_consumo_pct: 95,
      conta_mensal_energia: 25000,
      taxa_reajuste_anual: "8",
      economia_mensal: "R$ 22.800,00",
      payback_anos: "2,1 anos",
      investimento_total: "R$ 540.000,00",
      producao_anual: "295.000 kWh/ano",
    },
    sections: [
      makeSection("cover", "split-editorial", "Capa", "", {
        title: "Usina Fotovoltaica & Autoconsumo Remoto",
        subtitle: `<p>Estudo de viabilidade técnica e financeira para <strong>${clientName}</strong></p>`,
        highlight: "Usina Solo · 185 kWp",
        alignment: "center",
        showCompanyName: true,
        companyNamePlacement: "header",
        companyNameAlign: "center",
        showLogo: false,
        backgroundColor: "#581c87",
        overlayColor: "#3b0764",
        overlayOpacity: 45,
        textColor: "#FFFFFF",
      }),
      makeSection(
        "diagnostic_energy",
        "cards",
        "Estudo de Carga e Rateio",
        "<p>Geração centralizada de solo com rateio inteligente de créditos para até 3 unidades consumidoras.</p>",
        {
          title: "Rateio de Créditos",
          text: "<p>Maximização da geração em área dedicada com distribuição de excedente para as filiais da empresa.</p>",
          painPoints: [
            {
              text: "Alta demanda em grupo A/B com faturas somadas acima de R$ 25 mil/mês",
              icon: "trending-up",
            },
            { text: "Falta de área disponível nas coberturas urbanas", icon: "alert-circle" },
            { text: "Exposição a oscilações e bandeiras tarifárias", icon: "plug" },
          ],
          impact: [
            { text: "Economia acumulada de R$ 6,8 Milhões em 25 anos", icon: "dollar-sign" },
            { text: "Retorno do investimento (ROI) de +418%", icon: "trending-up" },
            { text: "Operação autônoma com telemetria via satélite", icon: "shield" },
          ],
          highlightText: "ROI projetado de +418% e economia mensal média de R$ 22.800,00.",
          highlightIcon: "trending-up",
        }
      ),
      makeSection(
        "solution",
        "cards",
        "Engenharia da Usina",
        "<p>336 módulos bifaciais de 550W em estrutura de solo com subestação blindada dedicada.</p>",
        {
          title: "Engenharia & Especificações",
          solutionName: "Usina Solar de Solo 185 kWp",
          text: "<p>Solução turn-key completa incluindo supressão, fundações, subestação e aprovação junto à distribuidora.</p>",
          benefits: [
            { id: "u1", text: "Geração anual projetada de 295 MWh", icon: "sun" },
            { id: "u2", text: "Módulos bifaciais com ganho de albedo", icon: "zap" },
            { id: "u3", text: "Monitoramento por string e diagnóstico preditivo", icon: "factory" },
          ],
        }
      ),
    ],
  };
}

// -----------------------------------------------------------------------------
// 4. TEMPLATE WHATSAPP DA PLATAFORMA
// -----------------------------------------------------------------------------
function createWhatsAppProposalDocument(clientName = "Dr. Marcos Silveira"): ProposalDocumentJson {
  return {
    styles: {
      branding: {
        logoUrl: "",
        primaryColor: "#10B981",
        secondaryColor: "#34D399",
        backgroundColor: "#061814",
        textColor: "#F8FAFC",
      },
      typography: {
        fontFamily: "Inter",
        titleSize: 30,
        subtitleSize: 18,
        bodySize: 14,
        preset: "medium",
      },
      layout: {
        pageWidth: "medium",
        spacing: "normal",
        borderRadius: 16,
        shadowIntensity: 4,
      },
      cover: {
        imageUrl: "",
        overlayColor: "#022c22",
        overlayOpacity: 35,
        titleText: "Proposta Solar Digital Interativa",
        showLogo: false,
      },
      footer: {
        companyName: "EnergivIA WhatsApp Bot",
        contactInfo: "Atendimento comercial automatizado",
        showPageNumbers: true,
      },
    },
    variables: {
      nome_cliente: clientName,
      nome_empresa: "EnergivIA",
      data_proposta: new Date().toLocaleDateString("pt-BR"),
      tamanho_sistema_kw: "8.2 kWp",
      potencia_sistema_kwp: 8.2,
      geracao_mensal_kwh: 1050,
      cobertura_consumo_pct: 93,
      conta_mensal_energia: 980,
      taxa_reajuste_anual: "8",
      economia_mensal: "R$ 940,00",
      payback_anos: "2,6 anos",
      investimento_total: "R$ 26.500,00",
      producao_anual: "12.600 kWh/ano",
    },
    sections: [
      makeSection("cover", "minimal", "Capa", "", {
        title: "Proposta Solar Digital Instantânea",
        subtitle: `<p>Gerada automaticamente em 45 segundos para <strong>${clientName}</strong></p>`,
        highlight: "Conversão WhatsApp · 8.2 kWp",
        alignment: "center",
        showCompanyName: true,
        companyNamePlacement: "header",
        companyNameAlign: "center",
        showLogo: false,
        backgroundColor: "#064e3b",
        overlayColor: "#022c22",
        overlayOpacity: 35,
        textColor: "#FFFFFF",
      }),
      makeSection(
        "solution",
        "cards",
        "Resumo da Oportunidade",
        "<p>Estudo express gerado a partir do upload da fatura pelo WhatsApp.</p>",
        {
          title: "Estudo Express via IA",
          solutionName: "Gerador Fotovoltaico 8.2 kWp",
          text: "<p>Sua conta de R$ 980,00 cai para a taxa mínima de R$ 75,00. Economia imediata de R$ 940,00 todos os meses.</p>",
          benefits: [
            { id: "w1", text: "Economia garantida de R$ 940/mês", icon: "zap" },
            { id: "w2", text: "Retorno do investimento em 2,6 anos", icon: "trending-up" },
            { id: "w3", text: "Aceite digital com assinatura por link seguro", icon: "smartphone" },
          ],
        }
      ),
      makeSection(
        "pricing",
        "compact",
        "Condições de Pagamento",
        "<p>Opções sob medida com financiamento direto pelo WhatsApp.</p>",
        {
          title: "Investimento & Pagamento",
          paymentConditions: "Entrada zero com primeira parcela para 120 dias.",
        }
      ),
    ],
  };
}

// -----------------------------------------------------------------------------
// COMPONENTE SCALED PROPOSAL PREVIEW (RENDERIZA O TEMPLATE REAL DA PLATAFORMA)
// -----------------------------------------------------------------------------
export function MockProposalPreview({
  type,
  clientName,
  compact = false,
  className = "",
}: MockProposalPreviewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.42);

  const documentState = React.useMemo(() => {
    switch (type) {
      case "residential":
        return createResidentialProposalDocument(clientName ?? "Família Santana");
      case "commercial":
        return createCommercialProposalDocument(clientName ?? "Mercado Central");
      case "usinas":
      case "industrial":
        return createUsinasProposalDocument(clientName ?? "Fábrica Horizonte");
      case "whatsapp":
      default:
        return createWhatsAppProposalDocument(clientName ?? "Dr. Marcos Silveira");
    }
  }, [type, clientName]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const width = el.clientWidth;
      if (width > 0) {
        const targetWidth = 920;
        const newScale = Math.min(1, Math.max(0.25, width / targetWidth));
        setScale(newScale);
      }
    };

    updateScale();
    const observer = new ResizeObserver(() => updateScale());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const badgeText =
    type === "residential"
      ? "Template Residencial"
      : type === "commercial"
        ? "Template Comercial B3"
        : type === "whatsapp"
          ? "Template WhatsApp"
          : "Template Usina Solo";

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none pointer-events-none rounded-2xl bg-slate-950 border border-slate-800/80 shadow-2xl flex flex-col ${className}`}
    >
      {/* Top bar simulando o visualizador de templates da plataforma EnergivIA */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/95 px-3 py-1.5 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex gap-1 shrink-0">
            <span className="h-2 w-2 rounded-full bg-red-500/80" />
            <span className="h-2 w-2 rounded-full bg-amber-500/80" />
            <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[10px] font-semibold text-slate-300 truncate">
            {documentState.styles.cover.titleText}
          </span>
        </div>
        <span className="text-[8px] shrink-0 font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
          {badgeText}
        </span>
      </div>

      {/* Render do Template Real da plataforma via PreviewDocument */}
      <div className="relative flex-1 overflow-hidden bg-slate-950">
        <div
          style={{
            width: "920px",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          className="origin-top-left"
        >
          <PreviewDocument
            title={documentState.styles.cover.titleText}
            documentState={documentState}
            mode="web"
            viewport="desktop"
            publicLayout={!compact}
          />
        </div>
      </div>
    </div>
  );
}
