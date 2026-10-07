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
});
