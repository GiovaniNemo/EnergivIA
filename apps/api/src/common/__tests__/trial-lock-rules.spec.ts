import { describe, it, expect } from "vitest";
import { getTenantPlanDetails, computeIsTrialLocked } from "../utils/plan-limits";
import { getTrialDaysLeft, isTrialExpired } from "../utils/business-days";

describe("Trial Lock & Expiration Rules Suite", () => {
  it("should calculate isTrialLocked as true for normal user when 7-day trial is expired", () => {
    // Data de criação há mais de 10 dias úteis atrás
    const expiredTrialTenant = {
      id: "org-expired-trial",
      createdAt: new Date("2026-01-01"),
      subscription: null,
    };

    const planDetails = getTenantPlanDetails(expiredTrialTenant);
    expect(planDetails.isTrial).toBe(true);
    expect(planDetails.trialExpired).toBe(true);

    const isLocked = computeIsTrialLocked({
      role: "INTEGRATOR",
      isTrial: planDetails.isTrial,
      trialExpired: planDetails.trialExpired,
    });

    expect(isLocked).toBe(true);
  });

  it("should calculate isTrialLocked as false for user within the 7 trial days", () => {
    const activeTrialTenant = {
      id: "org-active-trial",
      createdAt: new Date(), // Criado hoje
      subscription: null,
    };

    const planDetails = getTenantPlanDetails(activeTrialTenant);
    expect(planDetails.isTrial).toBe(true);
    expect(planDetails.trialExpired).toBe(false);

    const isLocked = computeIsTrialLocked({
      role: "INTEGRATOR",
      isTrial: planDetails.isTrial,
      trialExpired: planDetails.trialExpired,
    });

    expect(isLocked).toBe(false);
  });

  it("should calculate isTrialLocked as false for active paying subscriptions", () => {
    const paidTenant = {
      id: "org-paid-pro",
      createdAt: new Date("2025-01-01"),
      subscription: {
        status: "active",
        currentPeriodEnd: new Date("2099-01-01"),
        plan: { name: "Plano Pro" },
      },
    };

    const planDetails = getTenantPlanDetails(paidTenant);
    expect(planDetails.isTrial).toBe(false);
    expect(planDetails.trialExpired).toBe(false);

    const isLocked = computeIsTrialLocked({
      role: "INTEGRATOR",
      isTrial: planDetails.isTrial,
      trialExpired: planDetails.trialExpired,
    });

    expect(isLocked).toBe(false);
  });

  it("should bypass trial lock for ADMIN and PLATFORM roles even if tenant trial is expired", () => {
    const expiredTrialTenant = {
      id: "org-expired-trial",
      createdAt: new Date("2026-01-01"),
      subscription: null,
    };

    const planDetails = getTenantPlanDetails(expiredTrialTenant);
    expect(planDetails.trialExpired).toBe(true);

    const isLockedAdmin = computeIsTrialLocked({
      role: "ADMIN",
      isTrial: planDetails.isTrial,
      trialExpired: planDetails.trialExpired,
    });
    expect(isLockedAdmin).toBe(false);

    const isLockedPlatform = computeIsTrialLocked({
      role: "PLATFORM",
      isTrial: planDetails.isTrial,
      trialExpired: planDetails.trialExpired,
    });
    expect(isLockedPlatform).toBe(false);
  });

  it("should bypass trial lock if tenant has specialAccessActive", () => {
    const specialAccessTenant = {
      id: "org-special-access",
      createdAt: new Date("2026-01-01"),
      settings: { specialAccessActive: true },
      subscription: null,
    };

    const planDetails = getTenantPlanDetails(specialAccessTenant);
    expect(planDetails.isTrial).toBe(false);
    expect(planDetails.trialExpired).toBe(false);

    const isLocked = computeIsTrialLocked({
      role: "INTEGRATOR",
      isTrial: planDetails.isTrial,
      trialExpired: planDetails.trialExpired,
      specialAccessActive: true,
    });
    expect(isLocked).toBe(false);
  });

  it("should default trial duration to 7 business days", () => {
    const today = new Date();
    expect(getTrialDaysLeft(today)).toBe(7);
    expect(isTrialExpired(today)).toBe(false);
  });
});
