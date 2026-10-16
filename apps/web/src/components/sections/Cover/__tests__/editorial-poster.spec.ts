import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EditorialPoster } from "../variants/EditorialPoster";
import type { CoverContent, CoverStyle, CoverTypographySizes } from "../cover-utils";

const mockContent: CoverContent = {
  title: "PROPOSTA COMERCIAL",
  subtitle: "Sistema Solar Fotovoltaico Conectado à Rede",
  clientName: "Carlos Mendes",
  companyName: "Solar Prime Energia",
  date: "16/10/2026",
  potenciaKwp: "9.92",
  geracaoMensal: "1.183",
  proposalNumber: "4123",
};

const mockStyle: Required<CoverStyle> = {
  backgroundColor: "#0e0e10",
  textColor: "#ffffff",
  coverHeight: 100,
  backgroundImage: "",
  overlayColor: "",
  overlayOpacity: 0,
  alignment: "center",
};

const mockTypography: CoverTypographySizes = {
  titleSize: 42,
  subtitleSize: 20,
  bodySize: 14,
};

describe("EditorialPoster Cover Variant", () => {
  it("renders editorial hierarchy with year, project number, bold title, and structured metadata", () => {
    const html = renderToStaticMarkup(
      React.createElement(EditorialPoster, {
        content: mockContent,
        style: mockStyle,
        typography: mockTypography,
        primaryColor: "#ec4899",
      })
    );

    // Fundo vetorial orbital presente
    expect(html).toContain("<svg");
    expect(html).toContain('data-variant="cover"');

    // Metadados de topo (ano e projeto)
    expect(html).toContain("2026");
    expect(html).toContain("PROJETO Nº");
    expect(html).toContain("4123");

    // Título central
    expect(html).toContain("PROPOSTA COMERCIAL");

    // Metadados de base estruturados
    expect(html).toContain("PROPOSTO A:");
    expect(html).toContain("Carlos Mendes");
    expect(html).toContain("ORGANIZADO POR:");
    expect(html).toContain("Solar Prime Energia");

    // Cor primária aplicada
    expect(html).toContain("#ec4899");
  });
});
