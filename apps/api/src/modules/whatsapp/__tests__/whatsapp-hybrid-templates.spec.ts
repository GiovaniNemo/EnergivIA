import { describe, it, expect } from "vitest";
import {
  isTemplateHybridCompatible,
  formatTemplateSelectionList,
  resolveChosenTemplate,
  type AvailableProposalTemplate,
} from "../whatsapp-bot.service";

describe("Templates Híbridos vs On-Grid no WhatsApp Bot", () => {
  describe("isTemplateHybridCompatible", () => {
    it("deve identificar template híbrido por palavra-chave no nome", () => {
      expect(isTemplateHybridCompatible({ name: "Modelo Híbrido Residencial" })).toBe(true);
      expect(isTemplateHybridCompatible({ name: "Proposta Bateria & Backup" })).toBe(true);
      expect(isTemplateHybridCompatible({ name: "Sistema BESS Industrial" })).toBe(true);
      expect(isTemplateHybridCompatible({ name: "Template com Armazenamento" })).toBe(true);
    });

    it("deve identificar template híbrido se config contiver seção storage_backup, hybrid_flow, critical_loads_autonomy ou equipamento de bateria", () => {
      expect(
        isTemplateHybridCompatible({
          name: "Modelo Executivo",
          config: {
            sections: [{ type: "storage_backup", title: "Armazenamento & Backup" }],
          },
        })
      ).toBe(true);

      expect(
        isTemplateHybridCompatible({
          name: "Modelo Autonomia",
          config: {
            sections: [{ type: "hybrid_flow", title: "Modos de Operação 24h" }],
          },
        })
      ).toBe(true);

      expect(
        isTemplateHybridCompatible({
          name: "Modelo No-Break",
          config: {
            sections: [{ type: "critical_loads_autonomy", title: "Cargas Protegidas" }],
          },
        })
      ).toBe(true);

      expect(
        isTemplateHybridCompatible({
          name: "Modelo Premium",
          config: {
            sections: [
              {
                type: "proposal_equipment",
                fields: {
                  equipmentLines: [{ productId: "p1", categoryName: "battery" }],
                },
              },
            ],
          },
        })
      ).toBe(true);
    });

    it("deve classificar templates convencionais como NÃO híbridos", () => {
      expect(isTemplateHybridCompatible({ name: "Modelo Comercial Moderno" })).toBe(false);
      expect(isTemplateHybridCompatible({ name: "Modelo Minimalista On-Grid" })).toBe(false);
      expect(isTemplateHybridCompatible({ name: "Padrão String & Micro" })).toBe(false);
    });
  });

  describe("formatTemplateSelectionList e Riscado (~...~)", () => {
    const templatesSample: AvailableProposalTemplate[] = [
      { id: "t1", name: "Modelo Comercial Padrão", isHybrid: false },
      { id: "t2", name: "Modelo Híbrido com Bateria (BESS)", isHybrid: true },
      { id: "t3", name: "Modelo Executivo Solar", isHybrid: false },
    ];

    it("para cotações On-Grid, deve listar todos os modelos normalmente sem riscado", () => {
      const { text, selectableTemplates } = formatTemplateSelectionList(templatesSample, false);
      expect(selectableTemplates).toHaveLength(3);
      expect(text).toContain("1️⃣ *Modelo Comercial Padrão*");
      expect(text).toContain("2️⃣ *Modelo Híbrido com Bateria (BESS)*");
      expect(text).toContain("3️⃣ *Modelo Executivo Solar*");
      expect(text).not.toContain("~");
    });

    it("para cotações Híbridas com templates híbridos do integrador, deve riscar os On-Grid com ~...~ e deixar selecionável apenas os Híbridos", () => {
      const { text, selectableTemplates, incompatibleTemplates } = formatTemplateSelectionList(
        templatesSample,
        true
      );

      // Apenas o modelo híbrido fica ativo como opção numerada
      expect(selectableTemplates).toHaveLength(1);
      expect(selectableTemplates[0]?.name).toBe("Modelo Híbrido com Bateria (BESS)");
      expect(text).toContain("1️⃣ *Modelo Híbrido com Bateria (BESS)*");

      // Os modelos on-grid devem aparecer riscados com a sintaxe do WhatsApp (~)
      expect(incompatibleTemplates).toHaveLength(2);
      expect(text).toContain("~Modelo Comercial Padrão (Incompatível com Baterias)~");
      expect(text).toContain("~Modelo Executivo Solar (Incompatível com Baterias)~");
    });

    it("para cotações Híbridas quando o integrador NÃO possui templates híbridos, deve ofertar o Blueprint Oficial Híbrido da plataforma e riscar os on-grid", () => {
      const onlyOnGridTemplates: AvailableProposalTemplate[] = [
        { id: "t1", name: "Modelo Comercial Padrão", isHybrid: false },
        { id: "t3", name: "Modelo Executivo Solar", isHybrid: false },
      ];

      const { text, selectableTemplates, incompatibleTemplates } = formatTemplateSelectionList(
        onlyOnGridTemplates,
        true
      );

      // Injeta o Blueprint Oficial Híbrido como opção 1
      expect(selectableTemplates).toHaveLength(1);
      expect(selectableTemplates[0]?.name).toContain("Híbrido");
      expect(text).toContain("1️⃣ *Modelo Híbrido & Backup Solar (EnergivIA)*");

      // E risca os templates On-Grid existentes do integrador
      expect(incompatibleTemplates).toHaveLength(2);
      expect(text).toContain("~Modelo Comercial Padrão (Incompatível com Baterias)~");
    });
  });

  describe("resolveChosenTemplate (Intercepção e Validação de Escolha)", () => {
    const templatesSample: AvailableProposalTemplate[] = [
      { id: "t1", name: "Modelo Comercial Padrão", isHybrid: false },
      { id: "t2", name: "Modelo Híbrido com Bateria", isHybrid: true },
    ];

    it("deve aceitar a escolha válida do template híbrido em cotação híbrida", () => {
      const resolution = resolveChosenTemplate("1", templatesSample, true);
      expect(resolution.success).toBe(true);
      expect(resolution.chosenTemplate?.id).toBe("t2");
    });

    it("deve rejeitar se o usuário tentar digitar a opção do modelo on-grid riscado em cotação híbrida", () => {
      // O modelo 2 foi riscado na cotação híbrida
      const resolution = resolveChosenTemplate("2", templatesSample, true);
      expect(resolution.success).toBe(false);
      expect(resolution.reason).toBe("incompatible_on_grid");
      expect(resolution.errorMessage).toContain("exclusivo para sistemas On-Grid");
    });
  });
});
