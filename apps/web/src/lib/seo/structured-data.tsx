import React from "react";

export interface FaqItem {
  question: string;
  answer: string;
}

export function buildOrganizationSchema(baseUrl: string) {
  const cleanBase = baseUrl.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${cleanBase}/#organization`,
    name: "EnergivIA",
    url: cleanBase,
    logo: `${cleanBase}/icon.png`,
    description:
      "Plataforma e software com inteligência artificial para integradores de energia solar: automação de propostas no WhatsApp, dimensionamento e CRM.",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+55-44-98811-7969",
      contactType: "customer service",
      areaServed: "BR",
      availableLanguage: ["Portuguese"],
    },
  };
}

export function buildWebSiteSchema(baseUrl: string) {
  const cleanBase = baseUrl.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${cleanBase}/#website`,
    url: cleanBase,
    name: "EnergivIA",
    description: "Software e Inteligência Artificial para Integradores de Energia Solar",
    publisher: {
      "@id": `${cleanBase}/#organization`,
    },
    inLanguage: "pt-BR",
  };
}

export function buildSoftwareApplicationSchema(baseUrl: string) {
  const cleanBase = baseUrl.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${cleanBase}/#software`,
    name: "EnergivIA",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Software para Integrador Solar",
    operatingSystem: "Web Browser, WhatsApp",
    url: cleanBase,
    description:
      "Software para integrador solar com geração instantânea de propostas no WhatsApp, extração automática de faturas de energia por IA, dimensionamento fotovoltaico e CRM completo.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      description: "Teste gratuito disponível para integradores solares.",
    },
    featureList: [
      "Leitura automática de contas de luz por IA",
      "Geração de propostas comerciais em menos de 2 minutos",
      "Execução direta e envio no WhatsApp",
      "Dimensionamento solar fotovoltaico com kits de distribuidores",
      "CRM e gestão de funil comercial solar",
      "Personalização com marca e identidade visual do integrador",
    ],
    publisher: {
      "@id": `${cleanBase}/#organization`,
    },
  };
}

export function buildFaqPageSchema(faqItems: readonly FaqItem[] | FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildRootGraphSchema(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationSchema(baseUrl),
      buildWebSiteSchema(baseUrl),
      buildSoftwareApplicationSchema(baseUrl),
    ],
  };
}

export function buildWebPageSchema(options: {
  url: string;
  title: string;
  description: string;
  baseUrl: string;
}) {
  const cleanBase = options.baseUrl.replace(/\/$/, "");
  const fullUrl = options.url.startsWith("http")
    ? options.url
    : `${cleanBase}${options.url.startsWith("/") ? "" : "/"}${options.url}`;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${fullUrl}/#webpage`,
    url: fullUrl,
    name: options.title,
    description: options.description,
    isPartOf: {
      "@id": `${cleanBase}/#website`,
    },
    inLanguage: "pt-BR",
  };
}

export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}): JSX.Element {
  return React.createElement("script", {
    type: "application/ld+json",
    dangerouslySetInnerHTML: {
      __html: JSON.stringify(data),
    },
  });
}
