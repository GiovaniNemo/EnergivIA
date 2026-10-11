import { describe, it, expect } from "vitest";
import { getTenantPlanDetails } from "../utils/plan-limits";
import { normalizePlanFeatures } from "@energivia/shared-types";

describe("Plan Limits & Features Suite", () => {
  it("should enforce that Standard / Essencial plan does NOT have WhatsApp sizing bot", () => {
    const standardTenant = {
      id: "org-standard-tenant",
      createdAt: new Date("2026-01-01"),
      subscription: {
        status: "active",
        currentPeriodEnd: new Date("2099-01-01"),
        plan: {
          name: "Plano Standard",
        },
      },
    };

    const planDetails = getTenantPlanDetails(standardTenant);
    expect(planDetails.tier).toBe("ESSENCIAL");
    expect(planDetails.features.hasWhatsappBot).toBe(false);
    expect(planDetails.features.maxWhatsappNumbers).toBe(0);

    const whatsappBullet = planDetails.features.bulletPoints?.find((item) =>
      typeof item === "string"
        ? item.toLowerCase().includes("whatsapp")
        : item.text.toLowerCase().includes("whatsapp")
    );
    expect(whatsappBullet).toBeDefined();
    if (typeof whatsappBullet === "object" && whatsappBullet !== null) {
      expect(whatsappBullet.included).toBe(false);
    }
  });

  it("should enforce that Essencial plan does NOT have WhatsApp sizing bot", () => {
    const essencialTenant = {
      id: "org-essencial-tenant",
      createdAt: new Date("2026-01-01"),
      subscription: {
        status: "active",
        currentPeriodEnd: new Date("2099-01-01"),
        plan: {
          name: "Plano Essencial",
        },
      },
    };

    const planDetails = getTenantPlanDetails(essencialTenant);
    expect(planDetails.tier).toBe("ESSENCIAL");
    expect(planDetails.features.hasWhatsappBot).toBe(false);
    expect(planDetails.features.maxWhatsappNumbers).toBe(0);
  });

  it("should enable WhatsApp sizing bot on Pro and Plus plans", () => {
    const proTenant = {
      id: "org-pro-tenant",
      createdAt: new Date("2026-01-01"),
      subscription: {
        status: "active",
        currentPeriodEnd: new Date("2099-01-01"),
        plan: {
          name: "Plano Pro",
        },
      },
    };

    const proDetails = getTenantPlanDetails(proTenant);
    expect(proDetails.tier).toBe("PRO");
    expect(proDetails.features.hasWhatsappBot).toBe(true);
    expect(proDetails.features.maxWhatsappNumbers).toBe(2);

    const plusTenant = {
      id: "org-plus-tenant",
      createdAt: new Date("2026-01-01"),
      subscription: {
        status: "active",
        currentPeriodEnd: new Date("2099-01-01"),
        plan: {
          name: "Plano Plus",
        },
      },
    };

    const plusDetails = getTenantPlanDetails(plusTenant);
    expect(plusDetails.tier).toBe("PLUS");
    expect(plusDetails.features.hasWhatsappBot).toBe(true);
    expect(plusDetails.features.maxWhatsappNumbers).toBe(5);
  });

  it("should normalize 'standard' plan name with default Essencial features", () => {
    const config = normalizePlanFeatures(null, "Standard");
    expect(config.hasWhatsappBot).toBe(false);
    expect(config.maxWhatsappNumbers).toBe(0);
  });
});
