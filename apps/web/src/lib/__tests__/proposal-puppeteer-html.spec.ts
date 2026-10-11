import { describe, it, expect } from "vitest";
import { proposalPuppeteerDocumentCss } from "../proposal-puppeteer-html";

describe("proposalPuppeteerDocumentCss", () => {
  it("should enforce A4 portrait with zero margin for full-bleed background", () => {
    const css = proposalPuppeteerDocumentCss();
    expect(css).toContain("size: A4");
    expect(css).toContain("margin: 0");
  });

  it("should define dedicated page styles for proposal-pdf-page with page-break-after", () => {
    const css = proposalPuppeteerDocumentCss();
    expect(css).toContain(".proposal-pdf-page");
    expect(css).toContain("break-after: page");
    expect(css).toContain("break-inside: avoid");
  });
});
