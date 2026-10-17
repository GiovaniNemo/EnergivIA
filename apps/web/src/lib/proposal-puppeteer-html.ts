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

    img {
      max-width: 100%;
      height: auto;
      object-fit: contain;
    }

    svg {
      max-width: 100%;
      height: auto;
    }

    /* Blindagem anti-distorção para logotipos institucionais */
    header img,
    footer img,
    .proposal-pdf-page header img,
    .proposal-pdf-page footer img,
    .proposal-cover-page img {
      object-fit: contain !important;
    }

    /* Fotos e molduras fotográficas com proporção travada e sem deformação */
    .proposal-photo-frame,
    .proposal-photo-frame img {
      object-fit: cover !important;
      object-position: center !important;
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

    /* Paridade com preview PDF paginado (cada .proposal-pdf-page = 1 folha A4 física). */
    [data-preview-scroll="true"],
    .proposal-pdf-mode-root {
      border: 0 !important;
      background: transparent !important;
      padding: 0 !important;
      margin: 0 !important;
      height: auto !important;
      overflow: visible !important;
    }

    body.proposal-puppeteer-body > div,
    [data-preview-scroll="true"] > div,
    .proposal-pdf-mode-root > div {
      display: block !important;
      gap: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    /* Folhas A4 físicas */
    .proposal-pdf-page {
      width: 210mm !important;
      min-height: 297mm !important;
      height: 297mm !important;
      max-height: 297mm !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      border: 0 !important;
      overflow: hidden !important;
      position: relative !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
    }

    .proposal-pdf-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    /* Compatibilidade para cover antiga caso renderizada fora de .proposal-pdf-page */
    .proposal-cover-page {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      border: 0 !important;
      overflow: hidden !important;
    }

    .proposal-content-section {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: auto !important;
      break-after: auto !important;
      width: 100% !important;
      margin: 0 !important;
    }

    a {
      color: var(--proposal-primary);
      text-decoration: underline;
    }

    @media print {
      body.proposal-puppeteer-body {
        background: var(--proposal-bg) !important;
      }
      .proposal-pdf-page {
        width: 210mm !important;
        height: 297mm !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .proposal-pdf-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
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
