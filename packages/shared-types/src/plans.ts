export interface PlanFeatureItem {
  text: string;
  included: boolean;
}

export interface PlanFeaturesConfig {
  /**
   * Limite de propostas comerciais geradas por mês (null ou 0 = ilimitado).
   * Free / Start = 20 total; Essencial = 50/mês; Pro = 120/mês; Plus = ilimitado.
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
   * Free / Start = 0; Essencial = 1; Pro = 2; Plus = ilimitado.
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
   * Free / Start e Essencial = false; Pro e Plus = true.
   */
  hasRadarSolar: boolean;

  /**
   * Personalização de marca / Logotipo da empresa na proposta.
   */
  hasCustomBranding?: boolean;

  /**
   * Lista de benefícios estruturados (texto + se está incluso ou não com X).
   */
  bulletPoints?: (string | PlanFeatureItem)[];

  /**
   * Versão garantidamente estruturada de bulletPoints.
   */
  featureItems?: PlanFeatureItem[];
}

export function normalizeFeatureItem(item: unknown): PlanFeatureItem {
  if (typeof item === "object" && item !== null && "text" in item) {
    const raw = item as { text?: unknown; included?: unknown };
    return {
      text: String(raw.text || "").trim(),
      included: raw.included !== false,
    };
  }
  const str = String(item || "").trim();
  if (
    str.startsWith("[x] ") ||
    str.startsWith("[X] ") ||
    str.startsWith("[-] ") ||
    str.startsWith("(x) ") ||
    str.startsWith("(X) ")
  ) {
    return {
      text: str.slice(4).trim(),
      included: false,
    };
  }
  return {
    text: str,
    included: true,
  };
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
    { text: "Até 20 propostas comerciais no período de teste", included: true },
    { text: "1 Usuário na equipe", included: true },
    { text: "Atendimento e dimensionamento no WhatsApp com IA", included: false },
    { text: "1 Template de proposta personalizado", included: false },
    { text: "CRM Solar e funil de vendas", included: true },
    { text: "Radar Solar ANEEL (Prospecção ativa)", included: false },
    { text: "Alertas quando o cliente abre a proposta", included: false },
  ],
};

export const DEFAULT_ESSENCIAL_PLAN_FEATURES: PlanFeaturesConfig = {
  maxProposalsPerMonth: 50,
  maxTeamMembers: 2,
  maxCustomTemplates: 1,
  maxWhatsappNumbers: 0,
  hasProposalViewAlerts: false,
  hasWhatsappBot: false,
  hasRadarSolar: false,
  hasCustomBranding: false,
  bulletPoints: [
    { text: "Até 50 propostas comerciais com IA por mês", included: true },
    { text: "2 Usuários na equipe (1 convidado)", included: true },
    { text: "Atendimento e dimensionamento no WhatsApp com IA", included: false },
    { text: "1 Template de proposta personalizado", included: true },
    { text: "CRM Solar e funil de vendas", included: true },
    { text: "Radar Solar ANEEL (Prospecção ativa na sua região)", included: false },
    { text: "Alertas quando o cliente abre a proposta", included: false },
  ],
};

export const DEFAULT_PRO_PLAN_FEATURES: PlanFeaturesConfig = {
  maxProposalsPerMonth: 120,
  maxTeamMembers: 5,
  maxCustomTemplates: null, // ilimitado
  maxWhatsappNumbers: 2,
  hasProposalViewAlerts: true,
  hasWhatsappBot: true,
  hasRadarSolar: true,
  hasCustomBranding: true,
  bulletPoints: [
    { text: "Até 120 propostas comerciais com IA por mês", included: true },
    { text: "Até 5 usuários na equipe", included: true },
    { text: "Até 2 números de WhatsApp com IA 24/7", included: true },
    { text: "Criação de templates personalizados ilimitados", included: true },
    { text: "CRM Solar com histórico e follow-up", included: true },
    { text: "Radar Solar ANEEL Integrado na sua região", included: true },
    { text: "Alertas em tempo real quando o cliente abre a proposta", included: true },
  ],
};

export const DEFAULT_PLUS_PLAN_FEATURES: PlanFeaturesConfig = {
  maxProposalsPerMonth: null, // ilimitado
  maxTeamMembers: null, // ilimitado
  maxCustomTemplates: null, // ilimitado
  maxWhatsappNumbers: 5,
  hasProposalViewAlerts: true,
  hasWhatsappBot: true,
  hasRadarSolar: true,
  hasCustomBranding: true,
  bulletPoints: [
    { text: "Propostas comerciais com IA ilimitadas", included: true },
    { text: "Usuários e vendedores ilimitados na equipe", included: true },
    { text: "Até 5 números de WhatsApp com IA", included: true },
    { text: "Criação de templates personalizados ilimitados", included: true },
    { text: "CRM Solar completo com histórico e follow-up", included: true },
    { text: "Radar Solar ANEEL Nacional Ilimitado", included: true },
    { text: "Alertas instantâneos e rastreamento de abertura", included: true },
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
    nameLower.includes("standard") ||
    nameLower.includes("básic") ||
    nameLower.includes("basic")
  ) {
    baseDefaults = DEFAULT_ESSENCIAL_PLAN_FEATURES;
  }

  const defaultItems = (baseDefaults.bulletPoints || []).map(normalizeFeatureItem);

  if (!rawFeatures) {
    return {
      ...baseDefaults,
      bulletPoints: defaultItems,
      featureItems: defaultItems,
    };
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
        .filter(Boolean)
        .map(normalizeFeatureItem);
      const finalItems = items.length > 0 ? items : defaultItems;
      return {
        ...baseDefaults,
        bulletPoints: finalItems,
        featureItems: finalItems,
      };
    }
  } else if (typeof rawFeatures === "object" && rawFeatures !== null) {
    if (Array.isArray(rawFeatures)) {
      const items = rawFeatures.map(normalizeFeatureItem);
      return {
        ...baseDefaults,
        bulletPoints: items,
        featureItems: items,
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

    let structuredItems: PlanFeatureItem[] = defaultItems;
    if (Array.isArray(parsed["bulletPoints"])) {
      structuredItems = (parsed["bulletPoints"] as unknown[]).map(normalizeFeatureItem);
    } else if (Array.isArray(parsed["featureItems"])) {
      structuredItems = (parsed["featureItems"] as unknown[]).map(normalizeFeatureItem);
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
      bulletPoints: structuredItems,
      featureItems: structuredItems,
    };
  }

  return {
    ...baseDefaults,
    bulletPoints: defaultItems,
    featureItems: defaultItems,
  };
}
