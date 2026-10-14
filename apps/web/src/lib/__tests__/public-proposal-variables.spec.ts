import { describe, it, expect } from "vitest";
import { mergePublicProposalVariables } from "../public-proposal-variables";
import type { PublicProposalPayload } from "../public-proposals-api";

describe("mergePublicProposalVariables - Investment Total Consistency", () => {
  it("should format investimento_total matching quotedSaleBrl when sourceType is kwp_rate", () => {
    const payload = {
      id: "prop-123",
      title: "Proposta Comercial",
      status: "SENT",
      validUntil: new Date(Date.now() + 86400000).toISOString(),
      renderedData: {
        integrator: {
          version: 1,
          sourceType: "kwp_rate" as const,
          quotedSaleBrl: 13230.0,
          computedSaleFromCostRulesBrl: 13230.0,
          equipmentSubtotalBrl: 6170.83,
          systemPowerKw: 4.41,
          kitItems: [
            { productName: "Módulo Astronergy 580W", quantity: 7 },
            { productName: "Inversor SAJ 1MPPT 3KW", quantity: 1 },
          ],
          projectCostLines: [
            {
              name: "Mão de obra",
              appliedAmountBrl: 1500,
            },
            {
              name: "Margem",
              appliedAmountBrl: 5559.17,
            },
          ],
        },
      },
      deal: {
        id: "deal-1",
        lead: {
          name: "Guilherme",
        },
      },
    };

    const variables = mergePublicProposalVariables({}, payload as unknown as PublicProposalPayload);
    // Deve formatar R$ 13.230,00 sem discrepância
    expect(variables?.["investimento_total"]).toBe("R$\u00a013.230,00");
  });
});
