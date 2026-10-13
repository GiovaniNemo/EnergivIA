import { describe, it, expect } from "vitest";
import {
  SECTION_PRESETS,
  getSectionPresets,
  getSectionPresetCategories,
} from "../template-section-presets";

describe("template-section-presets", () => {
  it("deve conter presets para testimonials e faq", () => {
    expect(SECTION_PRESETS.testimonials).toBeDefined();
    expect(SECTION_PRESETS.faq).toBeDefined();
    expect(SECTION_PRESETS.testimonials.length).toBeGreaterThan(0);
    expect(SECTION_PRESETS.faq.length).toBeGreaterThan(0);
  });

  it("cada preset de depoimentos deve conter name, subtitle, text e id", () => {
    const presets = getSectionPresets("testimonials");
    expect(presets.length).toBeGreaterThanOrEqual(6);

    for (const preset of presets) {
      expect(preset.id).toBeTruthy();
      expect(preset.category).toBeTruthy();
      expect(preset.title).toBeTruthy();
      expect(preset.data.name).toBeTruthy();
      expect(preset.data.subtitle).toBeTruthy();
      expect(preset.data.text).toBeTruthy();
    }
  });

  it("cada preset de FAQ deve conter question, answer, id e category", () => {
    const presets = getSectionPresets("faq");
    expect(presets.length).toBeGreaterThanOrEqual(6);

    for (const preset of presets) {
      expect(preset.id).toBeTruthy();
      expect(preset.category).toBeTruthy();
      expect(preset.title).toBeTruthy();
      expect(preset.data.question).toBeTruthy();
      expect(preset.data.answer).toBeTruthy();
    }
  });

  it("deve retornar lista de categorias únicas para cada seção", () => {
    const testimonialCategories = getSectionPresetCategories("testimonials");
    expect(testimonialCategories).toContain("Residencial");
    expect(testimonialCategories).toContain("Comércio");
    expect(testimonialCategories).toContain("Rural");

    const faqCategories = getSectionPresetCategories("faq");
    expect(faqCategories).toContain("Funcionamento & Rede");
    expect(faqCategories).toContain("Garantias & Manutenção");
    expect(faqCategories).toContain("Economia & Imóvel");
  });
});
