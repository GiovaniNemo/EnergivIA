const puppeteer = require("../apps/api/node_modules/puppeteer");
const path = require("path");
const fs = require("fs");

async function generatePdf() {
  console.log("[1/4] Inicializando browser headless Puppeteer...");
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=medium",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

    const htmlPath = path.resolve(__dirname, "../docs/fluxograma-plataforma-energivIA.html");
    const htmlUrl = "file:///" + htmlPath.replace(/\\/g, "/");

    console.log("[2/4] Carregando HTML:", htmlUrl);
    await page.goto(htmlUrl, { waitUntil: ["load", "networkidle0"], timeout: 30000 });

    console.log("[3/4] Aguardando renderização de fontes e diagramas Mermaid...");
    await page.evaluate(async () => {
      if (document.fonts) {
        await document.fonts.ready;
      }
    });

    // Wait until all .mermaid elements contain an SVG
    await page.waitForFunction(
      () => {
        const mermaidElements = document.querySelectorAll(".mermaid");
        if (mermaidElements.length === 0) return true;
        for (const el of mermaidElements) {
          if (!el.querySelector("svg")) return false;
        }
        return true;
      },
      { timeout: 20000 }
    );

    // Brief stabilization tick
    await new Promise((resolve) => setTimeout(resolve, 800));

    const outputPath = path.resolve(
      __dirname,
      "../docs/EnergivIA_Fluxograma_Completo_da_Plataforma.pdf"
    );
    console.log("[4/4] Gerando PDF de alta resolução com cabeçalho e rodapé em:", outputPath);

    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 7.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #64748b; width: 100%; display: flex; justify-content: space-between; padding: 0 14mm; margin-top: 4mm;">
          <span style="font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">EnergivIA &bull; Arquitetura Oficial da Plataforma</span>
          <span>Versão 2.0 (2026)</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 7.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #64748b; width: 100%; display: flex; justify-content: space-between; padding: 0 14mm; margin-bottom: 4mm;">
          <span>EnergivIA Inc. &bull; Todos os direitos reservados</span>
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: "14mm",
        bottom: "14mm",
        left: "14mm",
        right: "14mm",
      },
    });

    const stats = fs.statSync(outputPath);
    console.log(`Sucesso! PDF gerado com ${(stats.size / 1024).toFixed(1)} KB.`);
  } finally {
    await browser.close();
  }
}

generatePdf().catch((err) => {
  console.error("Erro na geração do PDF:", err);
  process.exit(1);
});
