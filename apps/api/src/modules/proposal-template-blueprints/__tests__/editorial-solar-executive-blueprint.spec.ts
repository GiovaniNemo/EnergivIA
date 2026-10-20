import { describe, it, expect } from "vitest";
import {
  EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT,
  EDITORIAL_SOLAR_EXECUTIVE_METADATA,
} from "../seeds/editorial-solar-executive-blueprint";

describe("Editorial Solar Executive Blueprint", () => {
  it("should have correct metadata for platform publication", () => {
    expect(EDITORIAL_SOLAR_EXECUTIVE_METADATA.slug).toBe("editorial-solar-executive");
    expect(EDITORIAL_SOLAR_EXECUTIVE_METADATA.name).toBe(
      "Template Oficial Editorial Solar Executive"
    );
    expect(EDITORIAL_SOLAR_EXECUTIVE_METADATA.published).toBe(true);
    expect(EDITORIAL_SOLAR_EXECUTIVE_METADATA.sortOrder).toBe(0);
    expect(EDITORIAL_SOLAR_EXECUTIVE_METADATA.thumbnailUrl).toContain("https://");
  });

  it("should have exactly 16 active sections in logical commercial order", () => {
    const expectedSectionTypes = [
      "cover",
      "introduction",
      "about_company",
      "diagnostic_energy",
      "solution",
      "generation_consumption",
      "proposal_equipment",
      "gallery",
      "economy_purchases",
      "pricing",
      "financing",
      "guarantees",
      "process_steps",
      "testimonials",
      "faq",
      "signature",
    ];

    const actualTypes = EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT.sections.map((s) => s.type);
    expect(actualTypes).toEqual(expectedSectionTypes);
    expect(EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT.sections).toHaveLength(16);
  });

  it("should configure professional styling tokens without neon or harsh colors", () => {
    const { branding, typography, layout, cover, footer } =
      EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT.styles;

    expect(branding.primaryColor).toBe("#059669");
    expect(branding.secondaryColor).toBe("#10B981");
    expect(branding.backgroundColor).toBe("#FAFFFC");
    expect(branding.textColor).toBe("#0F172A");

    expect(typography.fontFamily).toBe("Inter");
    expect(layout.borderRadius).toBe(16);
    expect(cover.imageUrl).toMatch(/^https?:\/\//);
    expect(footer.companyName).toBeTruthy();
  });

  it("should contain real photography references in cover, company and gallery", () => {
    const coverSection = EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT.sections.find(
      (s) => s.type === "cover"
    );
    expect(coverSection?.fields?.backgroundImage).toMatch(/^https?:\/\//);

    const aboutSection = EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT.sections.find(
      (s) => s.type === "about_company"
    );
    expect(aboutSection?.fields?.image).toMatch(/^https?:\/\//);

    const gallerySection = EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT.sections.find(
      (s) => s.type === "gallery"
    );
    const galleryItems = (gallerySection?.fields?.items as Array<{ photo: string }>) || [];
    expect(galleryItems.length).toBeGreaterThanOrEqual(4);
    for (const item of galleryItems) {
      expect(item.photo).toMatch(/(\/cover-segments\/|https?:\/\/)/);
    }
  });

  it("should not contain any whatsapp emojis in texts or titles", () => {
    const jsonString = JSON.stringify(EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT);
    // Verifica ausência de emojis Unicode comuns
    const emojiRegex =
      /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(jsonString)).toBe(false);
  });
});
