import { describe, it, expect } from "vitest";
import { inferSectionType } from "../utils";
import { createScratchProposalDocument } from "../../scratch-template-document";
import { SECTION_TYPE_LABELS, SECTION_TYPES } from "../section-fields";
import { fromTemplateConfig } from "../proposal-template-editor-orchestrator-helpers";
import type { ProposalTemplateConfig } from "@energivia/shared-types";

describe("Proposal Template Editor Utils & Scratch Creation", () => {
  describe("inferSectionType", () => {
    it("should infer 'solution' for 'Solução proposta' and 'Solução'", () => {
      expect(inferSectionType("Solução proposta", 3)).toBe("solution");
      expect(inferSectionType("Solução", 3)).toBe("solution");
      expect(inferSectionType("Solucao Proposta", 3)).toBe("solution");
      expect(inferSectionType("Nossa Solução", 3)).toBe("solution");
      expect(inferSectionType("Solution", 3)).toBe("solution");
    });

    it("should correctly infer all standard labels from SECTION_TYPE_LABELS", () => {
      for (const type of SECTION_TYPES) {
        if (type === "custom") continue;
        const label = SECTION_TYPE_LABELS[type];
        expect(
          inferSectionType(label, 1),
          `Expected label "${label}" to infer type "${type}"`
        ).toBe(type);
      }
    });

    it("should correctly infer common alternative Portuguese keywords", () => {
      expect(inferSectionType("Diagnóstico Energético", 1)).toBe("diagnostic_energy");
      expect(inferSectionType("Poder de compra", 1)).toBe("economy_purchases");
      expect(inferSectionType("Galeria de Fotos", 1)).toBe("gallery");
      expect(inferSectionType("Prova Social", 1)).toBe("social_proof");
      expect(inferSectionType("Garantias", 1)).toBe("guarantees");
      expect(inferSectionType("Etapas do Processo", 1)).toBe("process_steps");
      expect(inferSectionType("Perguntas Frequentes", 1)).toBe("faq");
      expect(inferSectionType("Resposta à proposta", 1)).toBe("cta");
      expect(inferSectionType("Comparação", 1)).toBe("comparison");
      expect(inferSectionType("Vídeo", 1)).toBe("video");
    });
  });

  describe("createScratchProposalDocument", () => {
    it("should create document where the solution section is of type 'solution' with complete fields and consistent title", () => {
      const doc = createScratchProposalDocument();
      const solutionSection = doc.sections.find((s) => s.type === "solution");

      expect(solutionSection).toBeDefined();
      expect(solutionSection?.title).toBe(SECTION_TYPE_LABELS.solution);
      expect(solutionSection?.type).toBe("solution");

      // Must have full fields populated from SECTION_DEFAULT_FIELDS
      const fields = solutionSection?.fields as Record<string, unknown> | undefined;
      expect(fields?.solutionName).toBeDefined();
      expect(Array.isArray(fields?.benefits)).toBe(true);
      expect((fields?.benefits as unknown[]).length).toBeGreaterThan(0);
      expect(fields?.howItWorks).toBeDefined();

      // No section should fall into 'custom' with generic fallback text
      const customSections = doc.sections.filter((s) => s.type === "custom");
      expect(customSections.length).toBe(0);
    });
  });

  describe("fromTemplateConfig auto-recovery", () => {
    it("should heal legacy scratch sections saved as 'custom' with title 'Solução proposta' to 'solution'", () => {
      const legacyConfig: ProposalTemplateConfig = {
        theme: { primaryColor: "#10b981", secondaryColor: "#059669" },
        sections: [
          { key: "cover", enabled: true, position: 1, title: "Capa" },
          { key: "custom", enabled: true, position: 2, title: "Solução proposta" },
        ],
        editor: {
          sections: [
            {
              id: "sec-1",
              type: "cover",
              variant: "full-image",
              order: 0,
              title: "Capa",
              content: {},
              style: {},
              visible: true,
            },
            {
              id: "sec-2",
              type: "custom",
              variant: "default",
              order: 1,
              title: "Solução proposta",
              content: {
                text: '<p>Caro(a) <span data-variable-token="nome_cliente">{{nome_cliente}}</span>, esta seção pode ser personalizada para sua narrativa comercial.</p>',
              },
              style: {},
              visible: true,
            },
          ],
          styles: {},
          variables: {},
        },
      };

      const doc = fromTemplateConfig(legacyConfig);
      expect(doc).not.toBeNull();
      const recoveredSection = doc?.sections.find((s) => s.id === "sec-2");
      expect(recoveredSection?.type).toBe("solution");
      const fields = recoveredSection?.fields as Record<string, unknown> | undefined;
      expect(fields?.solutionName).toBeDefined();
      expect(Array.isArray(fields?.benefits)).toBe(true);
    });
  });
});
