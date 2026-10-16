import { describe, expect, it } from "vitest";
import { distributeSectionsIntoPdfPages, getSectionPdfWeight } from "../pdf-pagination";
import type { ProposalSection } from "../types";

function mockSection(type: ProposalSection["type"], id: string): ProposalSection {
  return {
    id,
    type,
    variant: "default",
    title: type,
    content: "",
    fields: {},
  };
}

describe("pdf-pagination", () => {
  it("atribui peso 1.0 para seções complexas e 0.5 para seções compactas", () => {
    expect(getSectionPdfWeight(mockSection("about_company", "1"))).toBe(1.0);
    expect(getSectionPdfWeight(mockSection("proposal_equipment", "2"))).toBe(1.0);
    expect(getSectionPdfWeight(mockSection("generation_consumption", "3"))).toBe(1.0);
    expect(getSectionPdfWeight(mockSection("pricing", "4"))).toBe(1.0);

    expect(getSectionPdfWeight(mockSection("diagnostic_energy", "5"))).toBe(0.5);
    expect(getSectionPdfWeight(mockSection("solution", "6"))).toBe(0.5);
    expect(getSectionPdfWeight(mockSection("guarantees", "7"))).toBe(0.5);
    expect(getSectionPdfWeight(mockSection("process_steps", "8"))).toBe(0.5);
  });

  it("agrupa seções compactas de 0.5 em pares em uma mesma página", () => {
    const sections: ProposalSection[] = [
      mockSection("diagnostic_energy", "diag"),
      mockSection("solution", "sol"),
    ];

    const pages = distributeSectionsIntoPdfPages(sections, 2);
    expect(pages).toHaveLength(1);
    expect(pages[0].pageNumber).toBe(2);
    expect(pages[0].sections).toHaveLength(2);
    expect(pages[0].sections[0].id).toBe("diag");
    expect(pages[0].sections[1].id).toBe("sol");
  });

  it("isola seções de peso 1.0 em páginas dedicadas", () => {
    const sections: ProposalSection[] = [
      mockSection("diagnostic_energy", "diag"),
      mockSection("about_company", "about"),
      mockSection("solution", "sol"),
    ];

    const pages = distributeSectionsIntoPdfPages(sections, 2);
    // diag (0.5) não cabe com about (1.0), então diag fecha página 2
    // about (1.0) fica na página 3
    // sol (0.5) fica na página 4
    expect(pages).toHaveLength(3);
    expect(pages[0].pageNumber).toBe(2);
    expect(pages[0].sections.map((s) => s.id)).toEqual(["diag"]);
    expect(pages[1].pageNumber).toBe(3);
    expect(pages[1].sections.map((s) => s.id)).toEqual(["about"]);
    expect(pages[2].pageNumber).toBe(4);
    expect(pages[2].sections.map((s) => s.id)).toEqual(["sol"]);
  });

  it("limita a no máximo 2 seções por página para evitar overflow no A4", () => {
    const sections: ProposalSection[] = [
      mockSection("introduction", "intro"),
      mockSection("diagnostic_energy", "diag"),
      mockSection("solution", "sol"),
    ];

    const pages = distributeSectionsIntoPdfPages(sections, 2);
    expect(pages).toHaveLength(2);
    expect(pages[0].sections).toHaveLength(2);
    expect(pages[1].sections).toHaveLength(1);
  });

  it("particiona lista longa de equipamentos (> 6 itens) em páginas consecutivas para não cortar cards", () => {
    const longEquipmentSection: ProposalSection = {
      ...mockSection("proposal_equipment", "equip-long"),
      fields: {
        equipmentItems: [
          { name: "Painel 1", category: "module" },
          { name: "Painel 2", category: "module" },
          { name: "Inversor 1", category: "inverter" },
          { name: "Estrutura 1", category: "structure" },
          { name: "Estrutura 2", category: "structure" },
          { name: "Cabo Vermelho", category: "cables" },
          { name: "Cabo Preto", category: "cables" },
          { name: "Conector MC4", category: "accessories" },
          { name: "String Box", category: "protection" },
        ],
      },
    };

    const pages = distributeSectionsIntoPdfPages([longEquipmentSection], 2);
    // Deve quebrar em 2 páginas A4 dedicadas sequenciais (ex: 6 itens na primeira, 3 na segunda)
    expect(pages.length).toBe(2);
    expect(pages[0].sections).toHaveLength(1);
    expect(pages[1].sections).toHaveLength(1);
    const firstPartItems = (pages[0].sections[0].fields as { equipmentItems: unknown[] })
      .equipmentItems;
    const secondPartItems = (pages[1].sections[0].fields as { equipmentItems: unknown[] })
      .equipmentItems;
    expect(firstPartItems.length).toBeLessThanOrEqual(6);
    expect(firstPartItems.length + secondPartItems.length).toBe(9);
  });

  it("atribui peso maior para seções compactas que possuem alta densidade de texto", () => {
    const heavyCompactSection: ProposalSection = {
      ...mockSection("solution", "heavy-sol"),
      fields: {
        text: "A".repeat(800), // Texto longo
      },
    };
    expect(getSectionPdfWeight(heavyCompactSection)).toBe(1.0);
  });
});
