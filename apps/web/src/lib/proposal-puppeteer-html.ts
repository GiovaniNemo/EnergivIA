export type ProposalPuppeteerBranding = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function proposalPuppeteerDocumentCss(): string {
  return `
    @page {
      size: A4;
      margin: 0;
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    html.proposal-puppeteer {
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body.proposal-puppeteer-body {
      margin: 0;
      padding: 0;
      font-size: 11pt;
      line-height: 1.45;
      color: var(--proposal-text);
      background: var(--proposal-bg);
      font-family: var(--proposal-font);
    }

    img,
    svg {
      max-width: 100%;
      height: auto;
    }

    table {
      border-collapse: collapse;
      width: 100%;
    }

    .proposal-puppeteer-section {
      margin-bottom: 1.25rem;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .proposal-puppeteer-section--allow-break {
      page-break-inside: auto;
      break-inside: auto;
    }

    /* Paridade com preview PDF paginado (cada article = 1 página). */
    [data-preview-scroll="true"] {
      border: 0 !important;
      background: transparent !important;
      padding: 0 !important;
      height: auto !important;
      overflow: visible !important;
    }

    [data-preview-scroll="true"] > div {
      display: block !important;
      gap: 0 !important;
      margin: 0 !important;
    }

    /* Cover page is always full A4 page */
    .proposal-cover-page,
    [data-preview-scroll="true"] > div > article:first-child {
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      min-height: 100vh !important;
      height: 100vh !important;
      aspect-ratio: auto !important;
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      border: 0 !important;
      overflow: hidden !important;
    }

    /* Content sections flow naturally without forcing individual blank pages */
    .proposal-content-section,
    [data-preview-scroll="true"] > div > article:not(:first-child) {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: auto !important;
      break-after: auto !important;
      min-height: auto !important;
      height: auto !important;
      aspect-ratio: auto !important;
      width: 100% !important;
      max-width: none !important;
      margin: 0 0 1rem 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      border: 0 !important;
      overflow: visible !important;
    }

    [data-preview-scroll="true"] > div > article:last-child,
    [data-preview-scroll="true"] > div > article:last-of-type {
      page-break-after: avoid !important;
      break-after: avoid !important;
      margin-bottom: 0 !important;
    }

    a {
      color: var(--proposal-primary);
      text-decoration: underline;
    }

    @media print {
      body.proposal-puppeteer-body {
        background: var(--proposal-bg) !important;
      }
    }
  `;
}

export type WrapProposalHtmlForPuppeteerParams = {
  documentTitle: string;
  bodyHtml: string;
  branding: ProposalPuppeteerBranding;
  extraHeadHtml?: string;
};

export function wrapProposalHtmlForPuppeteer(params: WrapProposalHtmlForPuppeteerParams): string {
  const { documentTitle, bodyHtml, branding, extraHeadHtml } = params;
  const font =
    branding.fontFamily?.trim() || "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

  return `<!DOCTYPE html>
<html class="proposal-puppeteer" lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(documentTitle)}</title>
  <style>
    :root {
      --proposal-primary: ${branding.primaryColor};
      --proposal-secondary: ${branding.secondaryColor};
      --proposal-bg: ${branding.backgroundColor};
      --proposal-text: ${branding.textColor};
      --proposal-font: ${font};
    }
    ${proposalPuppeteerDocumentCss()}
  </style>
  ${extraHeadHtml ?? ""}
</head>
<body class="proposal-puppeteer-body">
${bodyHtml}
</body>
</html>`;
}

export const proposalPuppeteerPdfOptions = {
  format: "A4" as const,
  printBackground: true,
  preferCSSPageSize: true,
};
