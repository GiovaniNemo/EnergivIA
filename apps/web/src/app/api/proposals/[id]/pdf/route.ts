import { NextRequest, NextResponse } from "next/server";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import {
    wrapProposalHtmlForPuppeteer,
    proposalPuppeteerPdfOptions,
} from "@/lib/proposal-puppeteer-html";
import { templateConfigToPreviewDocument } from "@/lib/proposal-template-document";
import { mergePublicProposalVariables } from "@/lib/public-proposal-variables";
import type { PublicProposalPayload } from "@/lib/public-proposals-api";
import { auth0 } from "@/lib/auth0";

const BACKEND_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";

async function getBrowser() {
    const isLocal =
        process.env.NODE_ENV === "development" ||
        process.platform === "win32" ||
        process.platform === "darwin";

    if (isLocal) {
        const puppeteer = await import("puppeteer");
        return puppeteer.default.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
    }

    const CHROMIUM_URL =
        "https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar";
    const executablePath = await chromium.executablePath(CHROMIUM_URL);
    return puppeteerCore.launch({
        args: chromium.args,
        executablePath,
        headless: true,
    });
}

function toSafeAsciiFilename(raw: string): string {
    const normalized = raw
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-_.]+|[-_.]+$/g, "");
    return normalized.toLowerCase() || "proposta-solar";
}

/**
 * Monta o HTML estático da proposta sem precisar de um browser React.
 * Usa as mesmas funções de variáveis e template já existentes no projeto.
 */
function buildStaticProposalHtml(payload: PublicProposalPayload): string {
    // Sem template vinculado — fallback simples
    if (!payload.proposalTemplate?.config) {
        const clientName = payload.deal?.lead?.name ?? "Cliente";
        const title = payload.title ?? "Proposta Solar";
        return `
      <div style="font-family:system-ui,sans-serif;padding:40px;max-width:800px;margin:0 auto">
        <h1 style="font-size:24px;margin-bottom:8px">${title}</h1>
        <p style="color:#64748b">Cliente: ${clientName}</p>
        <p style="margin-top:24px;color:#dc2626">
          Esta proposta ainda não tem um template vinculado. 
          Vincule um template na tela interna da proposta e tente novamente.
        </p>
      </div>
    `;
    }

    // Constrói as variáveis a partir dos dados reais da proposta
    const base = templateConfigToPreviewDocument(payload.proposalTemplate.config);
    const mergedVariables = mergePublicProposalVariables(base.variables, payload);
    const branding = base.styles?.branding;

    // Pega as seções e monta HTML simples (sem React, sem Tailwind)
    // Usando abordagem de substituição de variáveis no HTML existente (se houver)
    // O template já tem o HTML configurado no editor; precisamos renderizá-lo estaticamente.
    // Por limitação server-side (sem React/ReactDOM disponível nesta rota),
    // geramos uma página com os dados principais formatados profissionalmente.

    const vars = mergedVariables as Record<string, string | number | undefined>;

    const fmt = (v: unknown) =>
        v !== undefined && v !== null && v !== "" ? String(v) : "—";

    const primaryColor = branding?.primaryColor ?? "#059669";
    const bgColor = branding?.backgroundColor ?? "#ffffff";
    const textColor = branding?.textColor ?? "#0f172a";
    const logoUrl =
        typeof branding?.logoUrl === "string" && branding.logoUrl.trim()
            ? branding.logoUrl.trim()
            : "";

    const logoHtml = logoUrl
        ? `<img src="${logoUrl}" alt="Logo" style="height:48px;object-fit:contain;margin-bottom:8px" />`
        : "";

    const discountLine =
        vars["investimento_desconto"] && vars["investimento_desconto"] !== "—"
            ? `<tr><td style="padding:6px 0;color:#64748b">Desconto</td><td style="padding:6px 0;text-align:right;color:#dc2626">- ${fmt(vars["investimento_desconto"])}</td></tr>`
            : "";

    return `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:${bgColor};color:${textColor};min-height:100vh">

      <!-- Capa -->
      <div style="background:${primaryColor};color:#fff;padding:60px 48px;min-height:340px;display:flex;flex-direction:column;justify-content:flex-end">
        ${logoHtml}
        <p style="font-size:13px;opacity:0.8;margin:0 0 8px">${fmt(vars["data_proposta"])}</p>
        <h1 style="font-size:36px;font-weight:800;margin:0 0 12px;line-height:1.2">${payload.title ?? "Proposta Solar"}</h1>
        <p style="font-size:18px;opacity:0.9;margin:0">Preparada para <strong>${fmt(vars["nome_cliente"])}</strong></p>
        ${vars["nome_empresa"] ? `<p style="font-size:14px;opacity:0.75;margin:8px 0 0">${fmt(vars["nome_empresa"])}</p>` : ""}
      </div>

      <div style="max-width:800px;margin:0 auto;padding:48px 32px">

        <!-- Resumo financeiro -->
        <section style="margin-bottom:40px">
          <h2 style="font-size:20px;font-weight:700;color:${primaryColor};margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid ${primaryColor}">
            Resumo da Proposta
          </h2>
          <table style="width:100%;border-collapse:collapse;font-size:15px">
            <tbody>
              <tr style="background:#f8fafc">
                <td style="padding:10px 12px;font-weight:600">Investimento Total</td>
                <td style="padding:10px 12px;text-align:right;font-weight:700;color:${primaryColor};font-size:18px">${fmt(vars["investimento_total"])}</td>
              </tr>
              ${discountLine}
              <tr>
                <td style="padding:10px 12px">Tamanho do Sistema</td>
                <td style="padding:10px 12px;text-align:right;font-weight:600">${fmt(vars["tamanho_sistema_kw"])}</td>
              </tr>
              <tr style="background:#f8fafc">
                <td style="padding:10px 12px">Economia Mensal Estimada</td>
                <td style="padding:10px 12px;text-align:right;font-weight:600;color:#16a34a">${fmt(vars["economia_mensal"])}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px">Economia Anual Estimada</td>
                <td style="padding:10px 12px;text-align:right;font-weight:600;color:#16a34a">${fmt(vars["economia_anual"])}</td>
              </tr>
              <tr style="background:#f8fafc">
                <td style="padding:10px 12px">Payback Estimado</td>
                <td style="padding:10px 12px;text-align:right;font-weight:600">${fmt(vars["payback_anos"])}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Sistema -->
        <section style="margin-bottom:40px">
          <h2 style="font-size:20px;font-weight:700;color:${primaryColor};margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid ${primaryColor}">
            Sistema Solar
          </h2>
          <table style="width:100%;border-collapse:collapse;font-size:15px">
            <tbody>
              ${vars["modulos_sistema"] && vars["modulos_sistema"] !== "—" ? `
              <tr style="background:#f8fafc">
                <td style="padding:10px 12px">Módulos</td>
                <td style="padding:10px 12px;text-align:right;font-weight:600">${fmt(vars["modulos_sistema"])}</td>
              </tr>` : ""}
              ${vars["inversor_sistema"] && vars["inversor_sistema"] !== "—" ? `
              <tr>
                <td style="padding:10px 12px">Inversor</td>
                <td style="padding:10px 12px;text-align:right;font-weight:600">${fmt(vars["inversor_sistema"])}</td>
              </tr>` : ""}
              ${vars["producao_anual"] && vars["producao_anual"] !== "—" ? `
              <tr style="background:#f8fafc">
                <td style="padding:10px 12px">Produção Anual Estimada</td>
                <td style="padding:10px 12px;text-align:right;font-weight:600">${fmt(vars["producao_anual"])}</td>
              </tr>` : ""}
              ${vars["geracao_mensal_kwh"] && vars["geracao_mensal_kwh"] !== "—" ? `
              <tr>
                <td style="padding:10px 12px">Geração Mensal Estimada</td>
                <td style="padding:10px 12px;text-align:right;font-weight:600">${fmt(vars["geracao_mensal_kwh"])} kWh</td>
              </tr>` : ""}
            </tbody>
          </table>
        </section>

        <!-- Validade -->
        <section style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:40px">
          <p style="margin:0;font-size:14px;color:#15803d">
            ✅ Esta proposta é válida até <strong>${new Date(payload.validUntil).toLocaleDateString("pt-BR")}</strong>.
            Entre em contato para mais informações.
          </p>
        </section>

        <!-- Rodapé -->
        <footer style="text-align:center;padding-top:24px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
          ${vars["nome_empresa"] ? `<p style="margin:0 0 4px;font-weight:600">${fmt(vars["nome_empresa"])}</p>` : ""}
          <p style="margin:0">Proposta gerada pela plataforma EnergivIA</p>
        </footer>

      </div>
    </div>
  `;
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
    // Verifica autenticação
    const session = await auth0.getSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: "Missing proposal id" }, { status: 400 });
    }

    try {
        // 1. Busca os dados da proposta via API pública (server-to-server, sem auth de browser)
        const apiUrl = `${BACKEND_URL}/public/proposals/${id}`;
        const apiResponse = await fetch(apiUrl, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            // sem credentials — rota é pública no backend
        });

        if (!apiResponse.ok) {
            const err = await apiResponse.json().catch(() => ({})) as { message?: string };
            return NextResponse.json(
                { error: err.message ?? `Proposta não encontrada (HTTP ${apiResponse.status})` },
                { status: apiResponse.status }
            );
        }

        const payload = (await apiResponse.json()) as PublicProposalPayload;

        // 2. Monta o HTML estático com as variáveis reais da proposta
        const bodyHtml = buildStaticProposalHtml(payload);

        const branding = payload.proposalTemplate?.config?.editor?.styles?.branding as {
            primaryColor?: string;
            secondaryColor?: string;
            backgroundColor?: string;
            textColor?: string;
            fontFamily?: string;
        } | undefined;

        const html = wrapProposalHtmlForPuppeteer({
            documentTitle: payload.title ?? "Proposta Solar",
            bodyHtml,
            branding: {
                primaryColor: branding?.primaryColor ?? "#059669",
                secondaryColor: branding?.secondaryColor ?? "#047857",
                backgroundColor: branding?.backgroundColor ?? "#ffffff",
                textColor: branding?.textColor ?? "#0f172a",
                fontFamily: branding?.fontFamily,
            },
        });

        // 3. Gera o PDF com Puppeteer a partir do HTML estático (sem navegar para URL)
        const browser = await getBrowser();
        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 45_000 });
            const pdf = await page.pdf(proposalPuppeteerPdfOptions);

            const safeFilename = toSafeAsciiFilename(payload.title ?? "proposta-solar");

            return new Response(Buffer.from(pdf), {
                status: 200,
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="${safeFilename}.pdf"`,
                    "Cache-Control": "no-store",
                },
            });
        } finally {
            await browser.close();
        }
    } catch (error) {
        console.error("[api/proposals/[id]/pdf] Erro:", error);
        const message = error instanceof Error ? error.message : "Falha ao gerar PDF";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
