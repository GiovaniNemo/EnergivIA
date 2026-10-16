import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PdfOrbitalBackground } from "../pdf-orbital-background";

describe("PdfOrbitalBackground", () => {
  it("renders an SVG with orbital arcs and curves", () => {
    const html = renderToStaticMarkup(
      React.createElement(PdfOrbitalBackground, {
        primaryColor: "#10b981",
        variant: "cover",
      })
    );

    expect(html).toContain("<svg");
    expect(html).toContain('viewBox="0 0 794 1123"');
    expect(html).toContain("<circle");
    expect(html).toContain("<path");
  });

  it("applies primary color to strokes dynamically", () => {
    const html = renderToStaticMarkup(
      React.createElement(PdfOrbitalBackground, {
        primaryColor: "#ec4899",
        variant: "cover",
      })
    );

    expect(html).toContain("#ec4899");
    expect(html).toContain('stroke="');
  });

  it("sets data-variant attribute properly for content and cover", () => {
    const coverHtml = renderToStaticMarkup(
      React.createElement(PdfOrbitalBackground, {
        primaryColor: "#10b981",
        variant: "cover",
      })
    );
    const contentHtml = renderToStaticMarkup(
      React.createElement(PdfOrbitalBackground, {
        primaryColor: "#10b981",
        variant: "content",
      })
    );

    expect(coverHtml).toContain('data-variant="cover"');
    expect(contentHtml).toContain('data-variant="content"');
  });
});
