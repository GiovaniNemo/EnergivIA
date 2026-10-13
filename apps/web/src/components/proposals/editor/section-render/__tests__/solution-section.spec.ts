import { describe, it, expect } from "vitest";
import {
  SECTION_VARIANTS,
  SECTION_FIELD_CONFIG,
  resolveSectionVariant,
} from "../../section-fields";
import { serializeSolutionBenefitsForAi } from "../../proposal-template-editor-orchestrator-helpers";

describe("Solution Section Configuration & Helpers", () => {
  it("possui variantes 'topics' e 'cards' configuradas para a seção solution", () => {
    expect(SECTION_VARIANTS.solution).toContain("topics");
    expect(SECTION_VARIANTS.solution).toContain("cards");
    expect(resolveSectionVariant("solution", "cards")).toBe("cards");
    expect(resolveSectionVariant("solution", "topics")).toBe("topics");
    expect(resolveSectionVariant("solution", "unknown")).toBe("unknown");
  });

  it("possui os campos essenciais configurados na seção solution (solutionName, text, benefits, howItWorks)", () => {
    const fields = SECTION_FIELD_CONFIG.solution;
    const fieldNames = fields.map((f) => f.name);

    expect(fieldNames).toContain("solutionName");
    expect(fieldNames).toContain("text");
    expect(fieldNames).toContain("benefits");
    expect(fieldNames).toContain("howItWorks");

    const benefitsField = fields.find((f) => f.name === "benefits");
    expect(benefitsField?.type).toBe("table");
    expect(benefitsField?.columns).toEqual(["text", "icon"]);
    expect(benefitsField?.maxRows).toBe(5);
  });

  it("serializa benefícios corretamente para o assistente de IA", () => {
    const mockFields = {
      benefits: [
        { text: "Economia de até 95%", icon: "zap" },
        { text: "Garantia de 25 anos", icon: "shield" },
      ],
    };

    const serialized = serializeSolutionBenefitsForAi(mockFields);
    expect(serialized).toContain("Economia de até 95%");
    expect(serialized).toContain("Garantia de 25 anos");
  });
});
