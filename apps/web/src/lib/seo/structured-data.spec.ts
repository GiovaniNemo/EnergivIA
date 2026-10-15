import { describe, expect, it } from "vitest";
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildSoftwareApplicationSchema,
  buildFaqPageSchema,
  buildWebPageSchema,
  buildRootGraphSchema,
} from "./structured-data";

describe("structured-data generators", () => {
  const baseUrl = "https://energivia.com.br";

  it("builds valid Organization schema", () => {
    const org = buildOrganizationSchema(baseUrl);
    expect(org["@context"]).toBe("https://schema.org");
    expect(org["@type"]).toBe("Organization");
    expect(org.name).toBe("EnergivIA");
    expect(org.url).toBe(baseUrl);
    expect(org.contactPoint.telephone).toBe("+55-44-98811-7969");
  });

  it("builds valid WebSite schema", () => {
    const website = buildWebSiteSchema(`${baseUrl}/`);
    expect(website["@context"]).toBe("https://schema.org");
    expect(website["@type"]).toBe("WebSite");
    expect(website.url).toBe(baseUrl);
    expect(website.publisher["@id"]).toBe(`${baseUrl}/#organization`);
  });

  it("builds valid SoftwareApplication schema", () => {
    const app = buildSoftwareApplicationSchema(baseUrl);
    expect(app["@context"]).toBe("https://schema.org");
    expect(app["@type"]).toBe("SoftwareApplication");
    expect(app.applicationCategory).toBe("BusinessApplication");
    expect(app.offers.price).toBe("0");
    expect(app.featureList.length).toBeGreaterThan(3);
  });

  it("builds valid FAQPage schema", () => {
    const faq = buildFaqPageSchema([
      { question: "Como funciona?", answer: "Funciona com IA." },
      { question: "É no WhatsApp?", answer: "Sim, no WhatsApp." },
    ]);
    expect(faq["@context"]).toBe("https://schema.org");
    expect(faq["@type"]).toBe("FAQPage");
    expect(faq.mainEntity).toHaveLength(2);
    expect(faq.mainEntity[0]?.name).toBe("Como funciona?");
    expect(faq.mainEntity[0]?.acceptedAnswer.text).toBe("Funciona com IA.");
  });

  it("builds valid WebPage schema", () => {
    const webPage = buildWebPageSchema({
      baseUrl,
      url: "/software-integrador-solar",
      title: "Software Integrador",
      description: "Software para integradores solares",
    });
    expect(webPage["@context"]).toBe("https://schema.org");
    expect(webPage["@type"]).toBe("WebPage");
    expect(webPage.url).toBe(`${baseUrl}/software-integrador-solar`);
    expect(webPage.isPartOf["@id"]).toBe(`${baseUrl}/#website`);
  });

  it("builds valid root @graph schema", () => {
    const rootGraph = buildRootGraphSchema(baseUrl);
    expect(rootGraph["@context"]).toBe("https://schema.org");
    expect(rootGraph["@graph"]).toHaveLength(3);
  });
});
