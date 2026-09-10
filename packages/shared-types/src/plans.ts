export interface PlanFeaturesConfig {
  /**
   * Limite de propostas comerciais geradas por mês (null ou 0 = ilimitado).
   * Free / Start = 20 total; Essencial = 50/mês; Pro/Plus = ilimitado.
   */
  maxProposalsPerMonth?: number | null;

  /**
   * Limite de usuários/membros na equipe incluindo o titular (null ou 0 = ilimitado).
   * Free / Start = 1; Essencial = 2; Pro = 5; Plus = ilimitado.
   */
  maxTeamMembers?: number | null;

  /**
   * Limite de templates customizados criados pela empresa (null = ilimitado).
   * Free / Start = 0 (usa templates oficiais padrão); Essencial = 1; Pro/Plus = ilimitado.
   */
  maxCustomTemplates?: number | null;

  /**
   * Limite de números de WhatsApp conectados para bot e cotações (null = ilimitado).
   * Free / Start = 0; Essencial = 1; Pro = 3; Plus = ilimitado.
   */
  maxWhatsappNumbers?: number | null;

  /**
   * Alerta em tempo real via E-mail e WhatsApp quando o cliente abre a proposta.
   * Free / Start e Essencial = false; Pro e Plus = true.
   */
  hasProposalViewAlerts: boolean;

  /**
   * Assistente de WhatsApp com IA para cotação e atendimento.
   */
  hasWhatsappBot: boolean;

  /**
   * Acesso completo ao Radar Solar ANEEL (lista, tabela, conversão de vizinhança).
   * Free / Start e Essencial = false (modo demo); Pro e Plus = true.
   */
  hasRadarSolar: boolean;

  /**
   * Personalização de marca / Whitelabel.
   */
  hasCustomBranding?: boolean;

  /**
   * Lista de benefícios em texto formatado para exibição nos cards de preços.
   */
  bulletPoints?: string[];
}

export const DEFAULT_TRIAL_PLAN_FEATURES: PlanFeaturesConfig = {
  maxProposalsPerMonth: 20,
  maxTeamMembers: 1,
  maxCustomTemplates: 0,
  maxWhatsappNumbers: 0,
  hasProposalViewAlerts: false,
  hasWhatsappBot: false,
  hasRadarSolar: false,
  hasCustomBranding: false,
  bulletPoints: [
    "Até 20 propostas comerciais no teste (5 dias úteis)",
    "1 Usuário / Acesso individual",
    "Modelos oficiais padrão EnergivIA",
    "Dimensionamento Solar Inteligente (HSP)",
    "CRM de Negociações básico",
    "Radar Solar ANEEL (Demonstração)",
  ],
};

export const DEFAULT_ESSENCIAL_PLAN_FEATURES: PlanFeaturesConfig = {
  maxProposalsPerMonth: 50,
  maxTeamMembers: 2,
  maxCustomTemplates: 1,
  maxWhatsappNumbers: 1,
  hasProposalViewAlerts: false,
  hasWhatsappBot: true,
  hasRadarSolar: false,
  hasCustomBranding: false,
  bulletPoints: [
    "Até 50 propostas comerciais por mês",
    "2 Usuários na equipe (1 convidado)",
    "Templates oficiais + 1 template personalizado",
    "1 Número de WhatsApp com IA integrado",
    "Dimensionamento Solar Inteligente (HSP)",
    "CRM Solar & Pipeline de Vendas",
    "Geração de PDF Comercial com sua logo",
  ],
};

export const DEFAULT_PRO_PLAN_FEATURES: PlanFeaturesConfig = {
  maxProposalsPerMonth: null, // ilimitado
  maxTeamMembers: 5,
  maxCustomTemplates: null, // ilimitado
  maxWhatsappNumbers: 3,
  hasProposalViewAlerts: true,
  hasWhatsappBot: true,
  hasRadarSolar: true,
  hasCustomBranding: true,
  bulletPoints: [
    "Propostas comerciais ilimitadas",
    "Até 5 Usuários / Vendedores na equipe",
    "Criação e edição de templates ilimitada",
    "Alertas em tempo real por Email e WhatsApp de visualização de proposta",
    "Bot de WhatsApp com IA 24/7 (até 3 números)",
    "Radar Solar ANEEL Completo (prospecção e lista)",
    "Suporte Prioritário no WhatsApp",
  ],
};

export const DEFAULT_PLUS_PLAN_FEATURES: PlanFeaturesConfig = {
  maxProposalsPerMonth: null, // ilimitado
  maxTeamMembers: null, // ilimitado
  maxCustomTemplates: null, // ilimitado
  maxWhatsappNumbers: null, // ilimitado
  hasProposalViewAlerts: true,
  hasWhatsappBot: true,
  hasRadarSolar: true,
  hasCustomBranding: true,
  bulletPoints: [
    "Propostas e cálculos ilimitados",
    "Usuários ilimitados na equipe",
    "Templates e layouts exclusivos ilimitados",
    "Alertas prioritários de proposta e follow-up",
    "Múltiplos Bots de WhatsApp com IA",
    "Radar Solar ANEEL Nacional Ilimitado",
    "Whitelabel Completo com sua marca",
    "Gerente de Contas Dedicado",
  ],
};

/**
 * Normaliza e resolve o objeto de configuração de features de um plano.
 */
export function normalizePlanFeatures(
  rawFeatures: unknown,
  planName?: string | null
): PlanFeaturesConfig {
  const nameLower = (planName || "").toLowerCase();
  let baseDefaults = DEFAULT_ESSENCIAL_PLAN_FEATURES;

  if (nameLower.includes("plus") || nameLower.includes("enterprise")) {
    baseDefaults = DEFAULT_PLUS_PLAN_FEATURES;
  } else if (nameLower.includes("pro") || nameLower.includes("premium")) {
    baseDefaults = DEFAULT_PRO_PLAN_FEATURES;
  } else if (
    nameLower.includes("start") ||
    nameLower.includes("free") ||
    nameLower.includes("trial")
  ) {
    baseDefaults = DEFAULT_TRIAL_PLAN_FEATURES;
  } else if (
    nameLower.includes("essencial") ||
    nameLower.includes("básic") ||
    nameLower.includes("basic")
  ) {
    baseDefaults = DEFAULT_ESSENCIAL_PLAN_FEATURES;
  }

  if (!rawFeatures) {
    return { ...baseDefaults };
  }

  let parsed: Record<string, unknown> | null = null;
  if (typeof rawFeatures === "string") {
    try {
      parsed = JSON.parse(rawFeatures) as Record<string, unknown>;
    } catch {
      // Se for string simples separada por vírgula
      const items = rawFeatures
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        ...baseDefaults,
        bulletPoints: items.length > 0 ? items : baseDefaults.bulletPoints,
      };
    }
  } else if (typeof rawFeatures === "object" && rawFeatures !== null) {
    if (Array.isArray(rawFeatures)) {
      return {
        ...baseDefaults,
        bulletPoints: rawFeatures.map(String).filter(Boolean),
      };
    }
    parsed = rawFeatures as Record<string, unknown>;
  }

  if (parsed && typeof parsed === "object") {
    // Se tiver o formato estruturado
    const maxProposals =
      parsed["maxProposalsPerMonth"] !== undefined
        ? parsed["maxProposalsPerMonth"] === null || parsed["maxProposalsPerMonth"] === 0
          ? null
          : Number(parsed["maxProposalsPerMonth"])
        : baseDefaults.maxProposalsPerMonth;

    const maxMembers =
      parsed["maxTeamMembers"] !== undefined
        ? parsed["maxTeamMembers"] === null || parsed["maxTeamMembers"] === 0
          ? null
          : Number(parsed["maxTeamMembers"])
        : baseDefaults.maxTeamMembers;

    const maxTemplates =
      parsed["maxCustomTemplates"] !== undefined
        ? parsed["maxCustomTemplates"] === null || parsed["maxCustomTemplates"] === 0
          ? null
          : Number(parsed["maxCustomTemplates"])
        : baseDefaults.maxCustomTemplates;

    const maxWhatsapp =
      parsed["maxWhatsappNumbers"] !== undefined
        ? parsed["maxWhatsappNumbers"] === null || parsed["maxWhatsappNumbers"] === 0
          ? null
          : Number(parsed["maxWhatsappNumbers"])
        : baseDefaults.maxWhatsappNumbers;

    const hasProposalViewAlerts =
      parsed["hasProposalViewAlerts"] !== undefined
        ? Boolean(parsed["hasProposalViewAlerts"])
        : baseDefaults.hasProposalViewAlerts;

    const hasWhatsappBot =
      parsed["hasWhatsappBot"] !== undefined
        ? Boolean(parsed["hasWhatsappBot"])
        : baseDefaults.hasWhatsappBot;

    const hasRadarSolar =
      parsed["hasRadarSolar"] !== undefined
        ? Boolean(parsed["hasRadarSolar"])
        : baseDefaults.hasRadarSolar;

    const hasCustomBranding =
      parsed["hasCustomBranding"] !== undefined
        ? Boolean(parsed["hasCustomBranding"])
        : Boolean(baseDefaults.hasCustomBranding);

    let bulletPoints = baseDefaults.bulletPoints;
    if (Array.isArray(parsed["bulletPoints"]) && parsed["bulletPoints"].length > 0) {
      bulletPoints = (parsed["bulletPoints"] as unknown[]).map(String);
    }

    return {
      maxProposalsPerMonth: maxProposals,
      maxTeamMembers: maxMembers,
      maxCustomTemplates: maxTemplates,
      maxWhatsappNumbers: maxWhatsapp,
      hasProposalViewAlerts,
      hasWhatsappBot,
      hasRadarSolar,
      hasCustomBranding,
      bulletPoints,
    };
  }

  return { ...baseDefaults };
}
