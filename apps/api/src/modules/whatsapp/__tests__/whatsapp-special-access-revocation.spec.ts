import { describe, it, expect } from "vitest";
import { getTenantPlanDetails } from "../../../common/utils/plan-limits";

describe("WhatsApp Bot - Special Access Revocation Suite", () => {
  it("should treat tenant with specialAccessRevoked as expired trial in plan details", () => {
    const tenant = {
      id: "org-revoked-wa",
      createdAt: new Date("2026-02-01"),
      settings: {
        specialAccessActive: false,
        specialAccessRevoked: true,
      },
      subscription: null,
    };

    const planDetails = getTenantPlanDetails(tenant);
    expect(planDetails.isTrial).toBe(true);
    expect(planDetails.trialExpired).toBe(true);
    expect(planDetails.tier).toBe("TRIAL");
    expect(planDetails.features.hasWhatsappBot).toBe(false);
  });

  it("should treat tenant with specialAccessActive as fully active Plus tier with WhatsApp bot enabled", () => {
    const tenant = {
      id: "org-active-wa",
      createdAt: new Date("2026-02-01"),
      settings: {
        specialAccessActive: true,
        specialAccessRevoked: false,
      },
      subscription: null,
    };

    const planDetails = getTenantPlanDetails(tenant);
    expect(planDetails.isTrial).toBe(false);
    expect(planDetails.trialExpired).toBe(false);
    expect(planDetails.tier).toBe("PLUS");
    expect(planDetails.features.hasWhatsappBot).toBe(true);
    expect(planDetails.features.maxProposalsPerMonth).toBeNull();
  });
});
