import {
  type PlanFeaturesConfig,
  normalizePlanFeatures,
  DEFAULT_TRIAL_PLAN_FEATURES,
  DEFAULT_PLUS_PLAN_FEATURES,
} from "@energivia/shared-types";

import { isTrialExpired, getTrialDaysLeft } from "./business-days";

export type TenantPlanTier = "TRIAL" | "ESSENCIAL" | "PRO" | "PLUS";

export interface TenantPlanDetails {
  tier: TenantPlanTier;
  planName: string;
  isTrial: boolean;
  trialDaysLeft: number;
  trialExpired: boolean;
  features: PlanFeaturesConfig;
}

/**
 * Extrai a configuração completa do plano ativo de um tenant.
 */
export function getTenantPlanDetails(tenant: {
  id: string;
  createdAt: Date | string;
  settings?: unknown;
  subscription?: {
    status: string;
    currentPeriodEnd?: Date | string | null;
    plan?: {
      id?: string;
      name?: string | null;
      features?: unknown;
    } | null;
  } | null;
}): TenantPlanDetails {
  const settings = (tenant.settings as Record<string, unknown> | null | undefined) ?? {};

  // 1. Checagem de Revogação Prioritária de Acesso Especial
  if (settings["specialAccessRevoked"] === true) {
    return {
      tier: "TRIAL",
      planName: "Plano Start (Revogado)",
      isTrial: true,
      trialDaysLeft: 0,
      trialExpired: true,
      features: { ...DEFAULT_TRIAL_PLAN_FEATURES },
    };
  }

  // 2. Checagem de Acesso Especial Ativo
  if (settings["specialAccessActive"] === true) {
    return {
      tier: "PLUS",
      planName: "Plano Plus (Acesso Especial)",
      isTrial: false,
      trialDaysLeft: 0,
      trialExpired: false,
      features: { ...DEFAULT_PLUS_PLAN_FEATURES },
    };
  }

  const isPeriodExpired =
    tenant.subscription?.currentPeriodEnd &&
    new Date(tenant.subscription.currentPeriodEnd).getTime() <= Date.now();

  const isSubActive =
    tenant.subscription && tenant.subscription.status === "active" && !isPeriodExpired;
  const plan = tenant.subscription?.plan;
  const planName = plan?.name || (isSubActive ? "Plano Essencial" : "Plano Start (Trial)");

  if (!isSubActive) {
    const createdDate = new Date(tenant.createdAt);
    const trialDaysLeft = getTrialDaysLeft(createdDate, 5);
    const trialExpired = isTrialExpired(createdDate, 5);
    return {
      tier: "TRIAL",
      planName: "Plano Start",
      isTrial: true,
      trialDaysLeft,
      trialExpired,
      features: { ...DEFAULT_TRIAL_PLAN_FEATURES },
    };
  }

  const nameLower = planName.toLowerCase();
  let tier: TenantPlanTier = "ESSENCIAL";
  if (nameLower.includes("plus") || nameLower.includes("enterprise")) {
    tier = "PLUS";
  } else if (nameLower.includes("pro") || nameLower.includes("premium")) {
    tier = "PRO";
  } else if (
    nameLower.includes("essencial") ||
    nameLower.includes("standard") ||
    nameLower.includes("básic") ||
    nameLower.includes("basic")
  ) {
    tier = "ESSENCIAL";
  }

  const features = normalizePlanFeatures(plan?.features, planName);

  return {
    tier,
    planName,
    isTrial: false,
    trialDaysLeft: 0,
    trialExpired: false,
    features,
  };
}
