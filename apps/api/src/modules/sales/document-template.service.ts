/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { DocumentType } from "@prisma/client";
import { PdfRendererService } from "../proposals/pdf-renderer.service";
import { CONTRACT_PF_TEMPLATE } from "./templates/contract-pf.template";
import { POWER_OF_ATTORNEY_PF_TEMPLATE } from "./templates/power-of-attorney-pf.template";

@Injectable()
export class DocumentTemplateService {
  private readonly logger = new Logger(DocumentTemplateService.name);
  private readonly logoBase64Cache = new Map<string, string>();

  constructor(private readonly pdfRenderer: PdfRendererService) {}

  /**
   * Converte URL ou arquivo de imagem em data URI Base64 para renderização 100% confiável no Chromium
   */
  async resolveImageToDataUri(urlOrPath?: string | null): Promise<string | null> {
    if (!urlOrPath || !urlOrPath.trim()) return null;
    const trimmed = urlOrPath.trim();
    if (trimmed.startsWith("data:image")) return trimmed;

    if (this.logoBase64Cache.has(trimmed)) {
      return this.logoBase64Cache.get(trimmed)!;
    }

    try {
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        const res = await fetch(trimmed, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          const mime = res.headers.get("content-type") || "image/png";
          const dataUri = `data:${mime};base64,${buffer.toString("base64")}`;
          this.logoBase64Cache.set(trimmed, dataUri);
          return dataUri;
        }
      } else if (trimmed.startsWith("/")) {
        const localPath = path.resolve(process.cwd(), trimmed.replace(/^\//, ""));
        if (fs.existsSync(localPath)) {
          const buffer = fs.readFileSync(localPath);
          const ext = path.extname(localPath).replace(".", "") || "png";
          const dataUri = `data:image/${ext};base64,${buffer.toString("base64")}`;
          this.logoBase64Cache.set(trimmed, dataUri);
          return dataUri;
        }
      }
    } catch (e: any) {
      this.logger.warn(`Não foi possível converter imagem para data URI: ${e?.message}`);
    }

    return trimmed;
  }

  /**
   * Prepara o conjunto completo de variáveis para o contrato solar com logo base64, tabela e qualificações
   */
  async prepareContractVariables(params: {
    sale: any;
    tenant: any;
    lead?: any;
    formattedDate?: string;
    clientSignatureBlock?: string;
    auditSheetHtml?: string;
  }): Promise<Record<string, string | number | undefined | null>> {
    const { sale, tenant, lead, formattedDate, clientSignatureBlock, auditSheetHtml } = params;

    const tenantSettings = (tenant?.settings as Record<string, unknown>) || {};
    const tenantName = tenant?.name || "EnergivIA Soluções Solares";
    const tenantCnpjRaw = typeof tenantSettings["cnpj"] === "string" ? tenantSettings["cnpj"] : "";
    const cleanCnpj = tenantCnpjRaw.replace(/\D/g, "");
    const formattedCnpj =
      cleanCnpj.length === 14
        ? cleanCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
        : tenantCnpjRaw || "—";

    const tenantAddressParts = [
      tenantSettings["street"],
      tenantSettings["number"],
      tenantSettings["neighborhood"],
      tenantSettings["city"],
      tenantSettings["state"] ? String(tenantSettings["state"]) : null,
      tenantSettings["cep"] ? `CEP ${tenantSettings["cep"]}` : null,
    ].filter(Boolean);

    const enderecoEmpresa =
      tenantAddressParts.length > 0
        ? tenantAddressParts.join(", ")
        : "Endereço cadastrado na plataforma";

    const tenantPix =
      (tenantSettings["contractPixKey"] as string) ||
      (tenantSettings["pixKey"] as string) ||
      (formattedCnpj !== "—" ? `Chave CNPJ: ${formattedCnpj}` : "A combinar com a Contratada");

    // Resolver Logo da Empresa em Base64
    const rawLogo = tenant?.logoUrl || "";
    const logoDataUri = await this.resolveImageToDataUri(rawLogo);
    let blocoLogo = "";
    if (logoDataUri) {
      blocoLogo = `<img src="${logoDataUri}" alt="${tenantName}" style="max-height: 52px; max-width: 175px; object-fit: contain; display: block;" />`;
    } else {
      blocoLogo = `<div style="font-size: 11pt; font-weight: 800; color: #0f172a; border-left: 3.5px solid #059669; padding-left: 8px; line-height: 1.2; text-transform: uppercase;">${tenantName}</div>`;
    }

    const signerName = lead?.name || sale?.legalRepresentativeName || "Cliente";
    const signerCpf = sale?.legalRepresentativeCpf || sale?.documentNumber || lead?.cpfCnpj || "—";
    const rgCliente = sale?.rgNumber ? `${sale.rgNumber} ${sale.rgIssuer ?? ""}`.trim() : "—";

    const formattedInvestment = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(sale?.investmentAmount || 0);

    const clientAddress =
      [
        sale?.installationAddress,
        sale?.installationCity,
        sale?.installationState ? String(sale?.installationState) : null,
        sale?.installationZip ? `CEP ${sale?.installationZip}` : null,
      ]
        .filter(Boolean)
        .join(", ") || "Endereço cadastrado";

    const isPj =
      sale?.customerType === "PJ" ||
      Boolean(lead?.cpfCnpj && lead.cpfCnpj.replace(/\D/g, "").length === 14);

    const qualificacaoContratante = isPj
      ? `<strong>${signerName}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>${sale?.documentNumber || lead?.cpfCnpj || "—"}</strong>, com sede e instalação em <strong>${clientAddress}</strong>, representada por seu representante legal <strong>${sale?.legalRepresentativeName || signerName}</strong>, CPF nº <strong>${sale?.legalRepresentativeCpf || signerCpf}</strong>.`
      : `<strong>${signerName}</strong>, inscrito(a) no CPF/MF sob o nº <strong>${signerCpf}</strong>, portador(a) do RG nº <strong>${rgCliente}</strong>, residente e domiciliado(a) no endereço da instalação: <strong>${clientAddress}</strong>.`;

    const qualificacaoContratada = `<strong>${tenantName}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>${formattedCnpj}</strong>, com sede em <strong>${enderecoEmpresa}</strong>, representada por seu consultor técnico/comercial <strong>${sale?.sellerName || "Representante Autorizado"}</strong>.`;

    // Equipamentos
    const renderedData = (sale?.proposal?.renderedData as Record<string, unknown>) || {};
    const integratorData = (renderedData["integrator"] as Record<string, unknown>) || {};
    const kitItems = (
      Array.isArray(integratorData["kitItems"]) ? integratorData["kitItems"] : []
    ) as Array<{
      productName?: string;
      brandName?: string;
      quantity?: number;
      categoryName?: string;
    }>;

    let tabelaEquipamentos = "";
    if (kitItems.length > 0) {
      const rows = kitItems
        .map(
          (item, idx) => `
        <tr>
          <td style="text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="font-weight: 600; color: #0f172a;">${item.productName || "Componente Fotovoltaico"}</td>
          <td style="color: #334155;">${item.brandName || "Fabricante Homologado"}</td>
          <td style="text-align: center; font-weight: 600;">${item.quantity ?? 1}</td>
        </tr>`
        )
        .join("");
      tabelaEquipamentos = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 8%; text-align: center;">Item</th>
            <th style="width: 52%;">Equipamento / Descrição Técnica</th>
            <th style="width: 25%;">Marca / Fabricante</th>
            <th style="width: 15%; text-align: center;">Qtd.</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>`;
    } else {
      const kwpDisplay = sale?.systemPowerKwp > 0 ? sale.systemPowerKwp.toFixed(2) : "—";
      tabelaEquipamentos = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 8%; text-align: center;">Item</th>
            <th style="width: 52%;">Equipamento / Descrição Técnica</th>
            <th style="width: 25%;">Padrão / Certificação</th>
            <th style="width: 15%; text-align: center;">Qtd.</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">1</td>
            <td><strong>Módulos Fotovoltaicos de Alta Eficiência</strong> (Potência total dimensionada: ${kwpDisplay} kWp)</td>
            <td>Selo INMETRO Classe A</td>
            <td style="text-align: center;">Lote compatível</td>
          </tr>
          <tr>
            <td style="text-align: center;">2</td>
            <td><strong>Inversor(es) de Frequência Solar On-Grid</strong> com monitoramento Wi-Fi integrado</td>
            <td>Certificado Portaria INMETRO</td>
            <td style="text-align: center;">Compatível</td>
          </tr>
          <tr>
            <td style="text-align: center;">3</td>
            <td><strong>Estrutura de Fixação</strong> em alumínio anodizado e aço inox para fixação dos módulos</td>
            <td>Resistência a intempéries</td>
            <td style="text-align: center;">1 Conjunto</td>
          </tr>
          <tr>
            <td style="text-align: center;">4</td>
            <td><strong>String Box e Proteções DC/AC</strong> (Dispositivos DPS e disjuntores de proteção)</td>
            <td>Conforme NBR 5410/16690</td>
            <td style="text-align: center;">1 Conjunto</td>
          </tr>
          <tr>
            <td style="text-align: center;">5</td>
            <td><strong>Cabos Solares Flexíveis 1,8kV CC com proteção UV e Conectores MC4</strong></td>
            <td>Norma ABNT NBR 16690</td>
            <td style="text-align: center;">Lote</td>
          </tr>
        </tbody>
      </table>`;
    }

    const customClauses =
      (sale?.notes && sale.notes.trim()) ||
      (typeof tenantSettings["customContractClauses"] === "string"
        ? (tenantSettings["customContractClauses"] as string).trim()
        : "");

    const blocoClausulasPersonalizadas = customClauses
      ? `<div class="section-title">15. DAS CONDIÇÕES E CLÁUSULAS ADICIONAIS DO INTEGRADOR</div>
<div class="box" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; margin-top: 6px;">
  <p style="font-weight: 600; color: #166534; font-size: 9pt; margin-bottom: 6px;">
    Ficam expressamente estipuladas entre as Partes as seguintes condições especiais e operacionais:
  </p>
  <div style="font-size: 9pt; color: #1e293b; white-space: pre-line; line-height: 1.45;">${customClauses}</div>
</div>`
      : `<div class="section-title">15. DAS CONDIÇÕES E CLÁUSULAS ADICIONAIS DO INTEGRADOR</div>
<p style="font-size: 9pt; color: #64748b; font-style: italic;">
  Não foram estipuladas condições acessórias adicionais para este atendimento, vigorando integralmente as cláusulas gerais e técnicas deste instrumento.
</p>`;

    const simulationResult = (sale?.proposal?.simulation?.result as Record<string, unknown>) || {};
    const genMonthly =
      simulationResult["estimatedGenerationMonthlyKwh"] ||
      simulationResult["monthlyGeneration"] ||
      simulationResult["monthlyProduction"] ||
      (sale?.systemPowerKwp > 0 ? Math.round(sale.systemPowerKwp * 125) : 450);

    const prazoDias = (tenantSettings["contractDeliveryDays"] as string) || "45";
    const garantiaMeses = (tenantSettings["contractWarrantyMonths"] as string) || "12";
    const multaRescisaoPct = (tenantSettings["contractFinePct"] as string) || "15%";

    return {
      bloco_logo_empresa: blocoLogo,
      logo_empresa: logoDataUri || rawLogo,
      nome_empresa: tenantName,
      cnpj_empresa: formattedCnpj,
      endereco_empresa: enderecoEmpresa,
      nome_vendedor: sale?.sellerName || "Consultor Técnico",
      qualificacao_contratada: qualificacaoContratada,
      qualificacao_contratante: qualificacaoContratante,
      nome_cliente: signerName,
      cpf_cliente: signerCpf,
      rg_cliente: rgCliente,
      endereco_instalacao: sale?.installationAddress || "—",
      cidade_instalacao: sale?.installationCity || "—",
      estado_instalacao: sale?.installationState || "—",
      cep_instalacao: sale?.installationZip || "—",
      concessionaria: sale?.distributionCompany || "—",
      numero_uc: sale?.consumerUnitNumber || "—",
      potencia_kwp: sale?.systemPowerKwp > 0 ? sale.systemPowerKwp.toFixed(2) : "—",
      valor_total: formattedInvestment,
      forma_pagamento: sale?.paymentMethod || "À Vista / Financiamento Bancário",
      tabela_equipamentos: tabelaEquipamentos,
      bloco_clausulas_personalizadas: blocoClausulasPersonalizadas,
      chave_pix: tenantPix,
      prazo_dias: prazoDias,
      garantia_meses: garantiaMeses,
      multa_rescisao_pct: multaRescisaoPct,
      geracao_estimada_kwh: `${genMonthly}`,
      data_atual:
        formattedDate ||
        new Date().toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      bloco_assinatura_cliente: clientSignatureBlock,
      folha_auditoria_anexa: auditSheetHtml,
    };
  }

  /**
   * Substitui tags dinâmicas {{tag}} no texto do template
   */
  replaceTags(template: string, data: Record<string, string | number | undefined | null>): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      const val = data[key];
      if (key === "folha_auditoria_anexa") {
        return val ? String(val) : "";
      }
      if (
        key === "bloco_logo_empresa" ||
        key === "bloco_clausulas_personalizadas" ||
        key === "tabela_equipamentos" ||
        key.startsWith("bloco_") ||
        key.startsWith("tabela_")
      ) {
        return val ? String(val) : "";
      }
      if (key === "bloco_assinatura_cliente") {
        if (val && val !== "—") return String(val);
        return `<div style="border: 1px dashed #94a3b8; background: #ffffff; border-radius: 6px; padding: 8px; text-align: center;">
          <div style="font-size: 7.5pt; font-weight: 600; color: #64748b; text-transform: uppercase;">
            Aguardando Assinatura Eletrônica
          </div>
          <div style="font-size: 7pt; color: #94a3b8; margin-top: 2px;">
            Validação em 2 etapas via OTP por e-mail
          </div>
        </div>`;
      }
      if (val === undefined || val === null || val === "") {
        return "—";
      }
      return String(val);
    });
  }

  /**
   * Retorna o HTML padrão de fábrica da plataforma para o tipo de documento
   */
  getFactoryDefaultTemplate(type: DocumentType | string): string {
    switch (String(type)) {
      case "CONTRATO_PF":
      case "CONTRATO_PJ":
        return CONTRACT_PF_TEMPLATE;
      case "PROCURACAO_PF":
      case "PROCURACAO_PJ":
        return POWER_OF_ATTORNEY_PF_TEMPLATE;
      default:
        throw new BadRequestException(`Tipo de documento não suportado: ${type}`);
    }
  }

  /**
   * Catálogo descritivo de variáveis dinâmicas disponíveis para contratos e procurações
   */
  getAvailableTemplateVariables(): Array<{
    key: string;
    label: string;
    description: string;
    category: "Empresa" | "Cliente" | "Sistema Solar" | "Comercial" | "Assinatura";
  }> {
    return [
      {
        key: "bloco_logo_empresa",
        label: "Logo Oficial da Empresa",
        description: "Imagem formatada da logo da sua empresa",
        category: "Empresa",
      },
      {
        key: "nome_empresa",
        label: "Nome da Empresa",
        description: "Razão social ou nome fantasia da integradora",
        category: "Empresa",
      },
      {
        key: "cnpj_empresa",
        label: "CNPJ da Empresa",
        description: "CNPJ formatado da integradora",
        category: "Empresa",
      },
      {
        key: "endereco_empresa",
        label: "Endereço da Empresa",
        description: "Sede completa cadastrada nas configurações",
        category: "Empresa",
      },
      {
        key: "nome_vendedor",
        label: "Consultor Técnico / Vendedor",
        description: "Nome do responsável técnico ou vendedor",
        category: "Empresa",
      },
      {
        key: "qualificacao_contratada",
        label: "Qualificação da Contratada",
        description: "Parágrafo jurídico completo da empresa integradora",
        category: "Empresa",
      },
      {
        key: "qualificacao_contratante",
        label: "Qualificação do Contratante",
        description: "Parágrafo jurídico completo do cliente (PF ou PJ)",
        category: "Cliente",
      },
      {
        key: "nome_cliente",
        label: "Nome do Cliente",
        description: "Nome completo do cliente ou representante",
        category: "Cliente",
      },
      {
        key: "cpf_cliente",
        label: "CPF / CNPJ do Cliente",
        description: "Documento oficial do cliente",
        category: "Cliente",
      },
      {
        key: "rg_cliente",
        label: "RG / IE do Cliente",
        description: "Registro geral ou Inscrição Estadual",
        category: "Cliente",
      },
      {
        key: "endereco_instalacao",
        label: "Endereço da Instalação",
        description: "Rua, número e complemento do local da usina",
        category: "Sistema Solar",
      },
      {
        key: "cidade_instalacao",
        label: "Cidade da Instalação",
        description: "Município onde os painéis serão instalados",
        category: "Sistema Solar",
      },
      {
        key: "estado_instalacao",
        label: "Estado (UF)",
        description: "UF da instalação (ex: PR, SP, MG)",
        category: "Sistema Solar",
      },
      {
        key: "cep_instalacao",
        label: "CEP da Instalação",
        description: "Código postal do imóvel",
        category: "Sistema Solar",
      },
      {
        key: "concessionaria",
        label: "Concessionária de Energia",
        description: "Distribuidora de energia (ex: COPEL, CPFL, CEMIG)",
        category: "Sistema Solar",
      },
      {
        key: "numero_uc",
        label: "Número da UC",
        description: "Unidade consumidora ou conta contrato",
        category: "Sistema Solar",
      },
      {
        key: "potencia_kwp",
        label: "Potência em kWp",
        description: "Potência de pico do gerador solar",
        category: "Sistema Solar",
      },
      {
        key: "geracao_estimada_kwh",
        label: "Geração Estimada (kWh)",
        description: "Média mensal de energia gerada em kWh/mês",
        category: "Sistema Solar",
      },
      {
        key: "tabela_equipamentos",
        label: "Tabela de Equipamentos",
        description: "Lista discriminada de painéis, inversores e estruturas",
        category: "Sistema Solar",
      },
      {
        key: "valor_total",
        label: "Valor Total do Contrato",
        description: "Investimento do sistema em Reais (R$)",
        category: "Comercial",
      },
      {
        key: "forma_pagamento",
        label: "Condições de Pagamento",
        description: "À vista, financiamento bancário ou parcelado",
        category: "Comercial",
      },
      {
        key: "chave_pix",
        label: "Chave PIX",
        description: "Chave PIX da integradora para transferências",
        category: "Comercial",
      },
      {
        key: "prazo_dias",
        label: "Prazo de Execução (Dias)",
        description: "Prazo padrão em dias para conclusão da usina",
        category: "Comercial",
      },
      {
        key: "garantia_meses",
        label: "Garantia da Instalação (Meses)",
        description: "Meses de garantia da mão de obra de montagem",
        category: "Comercial",
      },
      {
        key: "multa_rescisao_pct",
        label: "Multa de Rescisão (%)",
        description: "Percentual de multa por rescisão antecipada",
        category: "Comercial",
      },
      {
        key: "bloco_clausulas_personalizadas",
        label: "Cláusulas Adicionais",
        description: "Condições especiais personalizadas pelo integrador",
        category: "Comercial",
      },
      {
        key: "data_atual",
        label: "Data Atual",
        description: "Data de emissão por extenso (ex: 28 de outubro de 2026)",
        category: "Comercial",
      },
      {
        key: "bloco_assinatura_cliente",
        label: "Bloco de Assinatura",
        description: "Área de assinatura digital com carimbo e validação OTP",
        category: "Assinatura",
      },
      {
        key: "folha_auditoria_anexa",
        label: "Folha de Auditoria Jurídica",
        description: "Trilha criptográfica anexa no final do documento",
        category: "Assinatura",
      },
    ];
  }

  /**
   * Constrói o HTML final do documento a partir do tipo, dados e configurações do tenant
   */
  buildDocumentHtml(
    type: DocumentType | string,
    data: Record<string, string | number | undefined | null>,
    tenant?: any
  ): string {
    let rawTemplate = "";

    const tenantSettings = (tenant?.settings as Record<string, unknown>) || {};
    const customTemplates =
      (tenantSettings["customDocumentTemplates"] as Record<string, string>) || {};
    const customTemplate = customTemplates[String(type)];

    if (customTemplate && typeof customTemplate === "string" && customTemplate.trim().length > 0) {
      rawTemplate = customTemplate;
    } else {
      rawTemplate = this.getFactoryDefaultTemplate(type);
    }

    return this.replaceTags(rawTemplate, data);
  }

  /**
   * Renderiza o HTML em PDF via Chromium e computa o hash criptográfico SHA-256
   */
  async generatePdfWithHash(html: string): Promise<{ pdfBuffer: Buffer; sha256Hash: string }> {
    const pdfBuffer = await this.pdfRenderer.renderHtmlToPdf({ html });
    const sha256Hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    return {
      pdfBuffer,
      sha256Hash,
    };
  }

  getStorageDir(): string {
    const dir = path.resolve(process.cwd(), "uploads", "sales-documents");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  savePdfToDisk(fileName: string, buffer: Buffer): string {
    const dir = this.getStorageDir();
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  getPdfFromDisk(fileName: string): Buffer | null {
    const dir = this.getStorageDir();
    const filePath = path.join(dir, fileName);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
    return null;
  }
}
