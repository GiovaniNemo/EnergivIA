import { Injectable, NotFoundException, Logger, Optional, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CustomerType, SaleStatus, DocumentType, DocumentSignStatus } from "@prisma/client";
import { UpdateSaleDto } from "./dto/update-sale.dto";
import { QuerySalesDto } from "./dto/query-sales.dto";
import { DocumentTemplateService } from "./document-template.service";

const CUSTOMER_TYPE_PF = (CustomerType?.PF ?? "PF") as CustomerType;
const CUSTOMER_TYPE_PJ = (CustomerType?.PJ ?? "PJ") as CustomerType;
const SALE_STATUS_AWAITING = (SaleStatus?.AWAITING_ANALYSIS ?? "AWAITING_ANALYSIS") as SaleStatus;
const SALE_STATUS_DOCS_PENDING = (SaleStatus?.DOCUMENTS_PENDING ??
  "DOCUMENTS_PENDING") as SaleStatus;
const SALE_STATUS_CANCELED = (SaleStatus?.CANCELED ?? "CANCELED") as SaleStatus;
const DOC_STATUS_PENDING = (DocumentSignStatus?.PENDING ?? "PENDING") as DocumentSignStatus;
const DOC_TYPE_CONTRATO_PF = (DocumentType?.CONTRATO_PF ?? "CONTRATO_PF") as DocumentType;
const DOC_TYPE_CONTRATO_PJ = (DocumentType?.CONTRATO_PJ ?? "CONTRATO_PJ") as DocumentType;

function formatSaleDocument<T extends Record<string, unknown>>(d: T) {
  return {
    ...d,
    documentType: d["templateType"] ?? d["documentType"],
    signStatus: d["status"] ?? d["signStatus"],
    signToken: d["publicToken"] ?? d["signToken"],
  };
}

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(DocumentTemplateService)
    private readonly documentTemplateService?: DocumentTemplateService
  ) {}

  async convertToSale(
    tenantId: string,
    proposalId: string,
    user?: { name?: string; email?: string }
  ) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId },
      include: {
        sale: true,
        deal: {
          include: {
            lead: true,
          },
        },
        simulation: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException("Proposta não encontrada.");
    }

    if (proposal.sale) {
      return proposal.sale;
    }

    const lead = proposal.deal?.lead;
    const simInput = (proposal.simulation?.input as Record<string, unknown>) ?? {};
    const simResult = (proposal.simulation?.result as Record<string, unknown>) ?? {};
    const sizing = (simResult["sizing"] as Record<string, unknown>) ?? {};

    // Extrair potência e investimento com fallbacks robustos
    const systemPowerKwp =
      Number(sizing["recommendedPowerKw"]) ||
      Number(simInput["systemPowerKwp"]) ||
      Number(simInput["potenciaKwp"]) ||
      0;

    const rawIntegrator = (proposal.renderedData as Record<string, unknown> | null)?.[
      "integrator"
    ] as Record<string, unknown> | undefined;
    const quotedSaleBrl =
      typeof rawIntegrator?.["quotedSaleBrl"] === "number" ? rawIntegrator["quotedSaleBrl"] : null;
    const dealValue = proposal.deal?.value ? Number(proposal.deal.value) : null;

    const investmentAmount =
      (quotedSaleBrl ??
        (Number(simInput["investmentAmount"]) || Number(simInput["valorTotal"]) || 0)) ||
      dealValue ||
      0;

    // Determinar se é PF ou PJ
    const rawDoc = lead?.cpfCnpj?.replace(/\D/g, "") ?? "";
    const isPj = rawDoc.length > 11 || Boolean(lead?.company);
    const customerType = isPj ? CUSTOMER_TYPE_PJ : CUSTOMER_TYPE_PF;

    // Gerar número sequencial de venda por organização
    const lastSale = await this.prisma.sale.findFirst({
      where: { tenantId, saleNumber: { not: null } },
      orderBy: { saleNumber: "desc" },
      select: { saleNumber: true },
    });
    const saleNumber = Math.max(1000, lastSale?.saleNumber ?? 1000) + 1;

    const sellerName =
      user?.name ||
      user?.email ||
      (proposal.deal as unknown as { assignedUser?: { name?: string } })?.assignedUser?.name ||
      "Consultor EnergivIA";

    const sale = await this.prisma.sale.create({
      data: {
        tenantId,
        proposalId: proposal.id,
        dealId: proposal.dealId,
        saleNumber,
        status: SALE_STATUS_AWAITING,
        customerType,
        documentNumber: lead?.cpfCnpj ?? null,
        legalRepresentativeName: isPj ? lead?.name : null,
        installationAddress: typeof simInput["address"] === "string" ? simInput["address"] : null,
        installationCity: typeof simInput["city"] === "string" ? simInput["city"] : null,
        installationState: typeof simInput["state"] === "string" ? simInput["state"] : null,
        installationZip: typeof simInput["zipCode"] === "string" ? simInput["zipCode"] : null,
        distributionCompany:
          typeof simInput["distributor"] === "string" ? simInput["distributor"] : null,
        systemPowerKwp,
        investmentAmount,
        sellerName,
      },
    });

    // Se a proposta estava em DRAFT ou SENT, atualizar para ACCEPTED automaticamente
    try {
      if (proposal.status !== "ACCEPTED") {
        await this.prisma.proposal.update({
          where: { id: proposal.id },
          data: { status: "ACCEPTED" },
        });
      }
    } catch (err) {
      this.logger.warn(
        `Não foi possível atualizar status da proposta ${proposal.id} para ACCEPTED: ${err}`
      );
    }

    return sale;
  }

  async listSales(tenantId: string, query?: QuerySalesDto) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId,
    };

    if (query?.status && query.status !== "ALL") {
      const normalizedStatus = query.status === "CANCELLED" ? "CANCELED" : query.status;
      where["status"] = normalizedStatus;
    }

    if (query?.search?.trim()) {
      const search = query.search.trim();
      const num = Number(search);
      where["OR"] = [
        {
          proposal: {
            deal: {
              lead: {
                name: { contains: search, mode: "insensitive" },
              },
            },
          },
        },
        { documentNumber: { contains: search } },
        { legalRepresentativeName: { contains: search, mode: "insensitive" } },
        { installationCity: { contains: search, mode: "insensitive" } },
        { distributionCompany: { contains: search, mode: "insensitive" } },
        ...(Number.isFinite(num) ? [{ saleNumber: num }] : []),
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          proposal: {
            include: {
              deal: {
                include: {
                  lead: true,
                },
              },
            },
          },
          documents: {
            select: {
              id: true,
              templateType: true,
              title: true,
              status: true,
              publicToken: true,
              signedAt: true,
              signerName: true,
              signerCpf: true,
            },
          },
        },
      }),
      this.prisma.sale.count({ where }),
    ]);

    const mappedItems = items.map((sale) => {
      const lead = sale.proposal?.deal?.lead;
      const signerDoc = sale.documents?.find((d) => d.signerName?.trim());
      const proposalDeal = sale.proposal?.deal;

      const customerName =
        lead?.name?.trim() ||
        sale.legalRepresentativeName?.trim() ||
        signerDoc?.signerName?.trim() ||
        proposalDeal?.title
          ?.replace(/^(Sistema Fotovoltaico|Proposta Comercial)\s*[-–—]\s*/i, "")
          .trim() ||
        "Cliente não informado";

      const customerEmail = lead?.email || null;
      const customerPhone =
        lead?.whatsapp || (lead as unknown as { phone?: string })?.phone || null;
      const customerCpfCnpj = sale.documentNumber || lead?.cpfCnpj || signerDoc?.signerCpf || null;

      const rawRenderedIntegrator = (
        sale.proposal?.renderedData as Record<string, unknown> | null
      )?.["integrator"] as Record<string, unknown> | undefined;
      const quotedSaleBrl =
        typeof rawRenderedIntegrator?.["quotedSaleBrl"] === "number"
          ? rawRenderedIntegrator["quotedSaleBrl"]
          : null;
      const dealVal =
        proposalDeal?.value && typeof proposalDeal.value === "number" && proposalDeal.value > 0
          ? proposalDeal.value
          : null;

      const totalValue =
        (sale.investmentAmount && sale.investmentAmount > 0 ? sale.investmentAmount : null) ??
        quotedSaleBrl ??
        dealVal ??
        sale.investmentAmount ??
        0;

      return {
        ...sale,
        customerName,
        customerEmail,
        customerPhone,
        customerCpfCnpj,
        city: sale.installationCity,
        state: sale.installationState,
        utilityCompany: sale.distributionCompany,
        ucNumber: sale.consumerUnitNumber,
        totalValue,
        documents: sale.documents?.map((d) =>
          formatSaleDocument(d as unknown as Record<string, unknown>)
        ),
      };
    });

    return {
      items: mappedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSaleById(tenantId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        proposal: {
          include: {
            deal: {
              include: {
                lead: true,
              },
            },
            simulation: true,
          },
        },
        documents: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException("Venda não encontrada.");
    }

    const lead = sale.proposal?.deal?.lead;
    const signerDoc = sale.documents?.find((d) => d.signerName?.trim());
    const proposalDeal = sale.proposal?.deal;

    const customerName =
      lead?.name?.trim() ||
      sale.legalRepresentativeName?.trim() ||
      signerDoc?.signerName?.trim() ||
      proposalDeal?.title
        ?.replace(/^(Sistema Fotovoltaico|Proposta Comercial)\s*[-–—]\s*/i, "")
        .trim() ||
      "";

    const customerEmail = lead?.email || null;
    const customerPhone = lead?.whatsapp || (lead as unknown as { phone?: string })?.phone || null;
    const customerCpfCnpj = sale.documentNumber || lead?.cpfCnpj || signerDoc?.signerCpf || null;

    const rawRenderedIntegrator = (sale.proposal?.renderedData as Record<string, unknown> | null)?.[
      "integrator"
    ] as Record<string, unknown> | undefined;
    const quotedSaleBrl =
      typeof rawRenderedIntegrator?.["quotedSaleBrl"] === "number"
        ? rawRenderedIntegrator["quotedSaleBrl"]
        : null;
    const dealVal =
      proposalDeal?.value && typeof proposalDeal.value === "number" && proposalDeal.value > 0
        ? proposalDeal.value
        : null;

    const totalValue =
      (sale.investmentAmount && sale.investmentAmount > 0 ? sale.investmentAmount : null) ??
      quotedSaleBrl ??
      dealVal ??
      sale.investmentAmount ??
      0;

    return {
      ...sale,
      customerName,
      customerEmail,
      customerPhone,
      customerCpfCnpj,
      city: sale.installationCity,
      state: sale.installationState,
      utilityCompany: sale.distributionCompany,
      ucNumber: sale.consumerUnitNumber,
      totalValue,
      documents: sale.documents?.map((d) =>
        formatSaleDocument(d as unknown as Record<string, unknown>)
      ),
    };
  }

  async updateSale(tenantId: string, id: string, dto: UpdateSaleDto) {
    const existing = await this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        proposal: {
          include: {
            deal: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException("Venda não encontrada.");
    }

    // Se forneceu customerName, customerEmail, customerPhone ou customerCpfCnpj, atualizar no Lead vinculado
    if (
      existing.proposal?.deal?.leadId &&
      (dto.customerName || dto.customerEmail || dto.customerPhone || dto.customerCpfCnpj)
    ) {
      try {
        await this.prisma.lead.update({
          where: { id: existing.proposal.deal.leadId },
          data: {
            ...(dto.customerName && { name: dto.customerName }),
            ...(dto.customerEmail && { email: dto.customerEmail }),
            ...(dto.customerPhone && { whatsapp: dto.customerPhone }),
            ...(dto.customerCpfCnpj && { cpfCnpj: dto.customerCpfCnpj }),
          },
        });
      } catch (err) {
        this.logger.warn(
          `Falha ao atualizar cpfCnpj/lead na venda ${id}, tentando sem cpfCnpj: ${err}`
        );
        try {
          if (dto.customerName || dto.customerEmail || dto.customerPhone) {
            await this.prisma.lead.update({
              where: { id: existing.proposal.deal.leadId },
              data: {
                ...(dto.customerName && { name: dto.customerName }),
                ...(dto.customerEmail && { email: dto.customerEmail }),
                ...(dto.customerPhone && { whatsapp: dto.customerPhone }),
              },
            });
          }
        } catch (innerErr) {
          this.logger.warn(`Falha ao atualizar dados básicos do lead na venda ${id}: ${innerErr}`);
        }
      }
    }

    const birthDate =
      dto.birthDate != null && dto.birthDate !== "" ? new Date(dto.birthDate) : undefined;

    const docNum = dto.documentNumber || dto.customerCpfCnpj;
    const rgNum = dto.rgNumber || dto.customerRgIe;
    const instAddress =
      dto.installationAddress ||
      (dto.addressStreet
        ? [
            dto.addressStreet,
            dto.addressNumber ? `nº ${dto.addressNumber}` : "",
            dto.addressComp,
            dto.addressNeighborhood,
          ]
            .filter(Boolean)
            .join(", ")
        : undefined);

    const instCity = dto.installationCity || dto.city;
    const instState = dto.installationState || dto.state;
    const instZip = dto.installationZip || dto.zipCode;
    const distCompany = dto.distributionCompany || dto.utilityCompany;
    const ucNum = dto.consumerUnitNumber || dto.ucNumber;
    const sysPower = dto.systemPowerKwp !== undefined ? Number(dto.systemPowerKwp) : undefined;
    const investAmt =
      dto.investmentAmount !== undefined
        ? Number(dto.investmentAmount)
        : dto.totalValue !== undefined
          ? Number(dto.totalValue)
          : undefined;

    const updated = await this.prisma.sale.update({
      where: { id },
      data: {
        ...(dto.customerType !== undefined && { customerType: dto.customerType }),
        ...(docNum !== undefined && { documentNumber: docNum }),
        ...(rgNum !== undefined && { rgNumber: rgNum }),
        ...(dto.rgIssuer !== undefined && { rgIssuer: dto.rgIssuer }),
        ...(birthDate !== undefined && { birthDate }),
        ...(dto.maritalStatus !== undefined && { maritalStatus: dto.maritalStatus }),
        ...(dto.profession !== undefined && { profession: dto.profession }),
        ...(dto.legalRepresentativeName !== undefined && {
          legalRepresentativeName: dto.legalRepresentativeName,
        }),
        ...(dto.legalRepresentativeCpf !== undefined && {
          legalRepresentativeCpf: dto.legalRepresentativeCpf,
        }),
        ...(instAddress !== undefined && {
          installationAddress: instAddress,
        }),
        ...(instCity !== undefined && {
          installationCity: instCity,
        }),
        ...(instState !== undefined && {
          installationState: instState,
        }),
        ...(instZip !== undefined && {
          installationZip: instZip,
        }),
        ...(distCompany !== undefined && {
          distributionCompany: distCompany,
        }),
        ...(ucNum !== undefined && {
          consumerUnitNumber: ucNum,
        }),
        ...(sysPower !== undefined &&
          !Number.isNaN(sysPower) && {
            systemPowerKwp: sysPower,
          }),
        ...(investAmt !== undefined &&
          !Number.isNaN(investAmt) && {
            investmentAmount: investAmt,
          }),
        ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status !== undefined && {
          status:
            dto.status === ("CANCELLED" as unknown as SaleStatus)
              ? SALE_STATUS_CANCELED
              : dto.status,
        }),
      },
    });

    return updated;
  }

  async generateSaleDocument(tenantId: string, saleId: string, documentType: DocumentType) {
    if (!this.documentTemplateService) {
      throw new NotFoundException("Serviço de geração de documentos não inicializado.");
    }

    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: {
        proposal: {
          include: {
            deal: {
              include: {
                lead: true,
              },
            },
            simulation: true,
          },
        },
        tenant: true,
      },
    });

    if (!sale) {
      throw new NotFoundException("Venda não encontrada.");
    }

    const lead = sale.proposal?.deal?.lead;
    const tenant = sale.tenant;
    const tenantSettings = (tenant?.settings as Record<string, unknown>) || {};

    const formattedDate = new Date().toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const formattedInvestment = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(sale.investmentAmount);

    const signerName = lead?.name || sale.legalRepresentativeName || "Cliente";
    const signerCpf = sale.legalRepresentativeCpf || sale.documentNumber || lead?.cpfCnpj || "—";

    // Dados da Contratada (Empresa Integrador)
    const tenantCnpj =
      typeof tenantSettings["cnpj"] === "string" && tenantSettings["cnpj"].trim()
        ? tenantSettings["cnpj"].trim()
        : "—";

    const tenantAddressParts = [
      tenantSettings["street"],
      tenantSettings["number"],
      tenantSettings["neighborhood"],
      tenantSettings["city"],
      tenantSettings["state"] ? String(tenantSettings["state"]) : null,
      tenantSettings["cep"] ? `CEP ${tenantSettings["cep"]}` : null,
    ].filter(Boolean);
    const tenantAddress =
      tenantAddressParts.length > 0
        ? tenantAddressParts.join(", ")
        : "Endereço cadastrado na plataforma";

    const tenantPix =
      (tenantSettings["contractPixKey"] as string) ||
      (tenantSettings["pixKey"] as string) ||
      (tenantCnpj !== "—" ? `Chave CNPJ: ${tenantCnpj}` : "A combinar com a Contratada");

    // Logo da empresa
    const tenantLogo = tenant?.logoUrl || "";
    const blocoLogoEmpresa = tenantLogo
      ? `<img src="${tenantLogo}" alt="${tenant?.name || "Empresa"}" style="max-height: 48px; max-width: 170px; object-fit: contain; display: block;" />`
      : `<div style="font-size: 11pt; font-weight: 800; color: #0f172a; border-left: 3px solid #059669; padding-left: 8px; line-height: 1.2;">${tenant?.name || "ENERGIVIA"}</div>`;

    // Cláusulas adicionais personalizadas do integrador
    const customClauses =
      (sale.notes && sale.notes.trim()) ||
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

    // Qualificação das Partes
    const isPj =
      sale.customerType === "PJ" ||
      documentType === DOC_TYPE_CONTRATO_PJ ||
      Boolean(lead?.cpfCnpj && lead.cpfCnpj.replace(/\D/g, "").length === 14);

    const clientAddress =
      [
        sale.installationAddress,
        sale.installationCity,
        sale.installationState ? String(sale.installationState) : null,
        sale.installationZip ? `CEP ${sale.installationZip}` : null,
      ]
        .filter(Boolean)
        .join(", ") || "Endereço cadastrado";

    const qualificacaoContratante = isPj
      ? `<strong>${signerName}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>${sale.documentNumber || lead?.cpfCnpj || "—"}</strong>, com sede e instalação em <strong>${clientAddress}</strong>, representada por seu representante legal <strong>${sale.legalRepresentativeName || signerName}</strong>, CPF nº <strong>${sale.legalRepresentativeCpf || signerCpf}</strong>.`
      : `<strong>${signerName}</strong>, inscrito(a) no CPF/MF sob o nº <strong>${signerCpf}</strong>, portador(a) do RG nº <strong>${sale.rgNumber ? `${sale.rgNumber} ${sale.rgIssuer ?? ""}`.trim() : "—"}</strong>, com domicílio e instalação em <strong>${clientAddress}</strong>.`;

    const qualificacaoContratada = `<strong>${tenant?.name || "EnergivIA Soluções Solares"}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>${tenantCnpj}</strong>, com sede em <strong>${tenantAddress}</strong>, representada por seu consultor técnico/comercial <strong>${sale.sellerName || "Representante Autorizado"}</strong>.`;

    // Tabela de Equipamentos
    const renderedData = (sale.proposal?.renderedData as Record<string, unknown>) || {};
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
      const kwpDisplay = sale.systemPowerKwp > 0 ? sale.systemPowerKwp.toFixed(2) : "—";
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

    const simulationResult = (sale.proposal?.simulation?.result as Record<string, unknown>) || {};
    const genMonthly =
      simulationResult["estimatedGenerationMonthlyKwh"] ||
      simulationResult["monthlyGeneration"] ||
      simulationResult["monthlyProduction"] ||
      (sale.systemPowerKwp > 0 ? Math.round(sale.systemPowerKwp * 125) : 450);

    const prazoDias = (tenantSettings["contractDeliveryDays"] as string) || "45";
    const garantiaMeses = (tenantSettings["contractWarrantyMonths"] as string) || "12";
    const multaRescisaoPct = (tenantSettings["contractFinePct"] as string) || "15%";

    const data: Record<string, string | number | undefined | null> = {
      bloco_logo_empresa: blocoLogoEmpresa,
      qualificacao_contratada: qualificacaoContratada,
      qualificacao_contratante: qualificacaoContratante,
      tabela_equipamentos: tabelaEquipamentos,
      bloco_clausulas_personalizadas: blocoClausulasPersonalizadas,
      chave_pix: tenantPix,
      prazo_dias: prazoDias,
      garantia_meses: garantiaMeses,
      multa_rescisao_pct: multaRescisaoPct,
      geracao_estimada_kwh: `${genMonthly}`,
      nome_cliente: signerName,
      cpf_cliente: sale.documentNumber || lead?.cpfCnpj || "—",
      rg_cliente: sale.rgNumber ? `${sale.rgNumber} ${sale.rgIssuer ?? ""}`.trim() : "—",
      endereco_instalacao: sale.installationAddress || "—",
      cidade_instalacao: sale.installationCity || "—",
      estado_instalacao: sale.installationState || "—",
      cep_instalacao: sale.installationZip || "—",
      concessionaria: sale.distributionCompany || "—",
      numero_uc: sale.consumerUnitNumber || "—",
      potencia_kwp: sale.systemPowerKwp > 0 ? sale.systemPowerKwp.toFixed(2) : "—",
      valor_total: formattedInvestment,
      forma_pagamento: sale.paymentMethod || "À Vista / Financiamento Bancário",
      nome_empresa: tenant?.name || "EnergivIA Soluções Solares",
      nome_vendedor: sale.sellerName || "Consultor Técnico",
      data_atual: formattedDate,
    };

    const html = this.documentTemplateService.buildDocumentHtml(documentType, data);
    const { pdfBuffer, sha256Hash } = await this.documentTemplateService.generatePdfWithHash(html);

    const docTitle =
      documentType === DOC_TYPE_CONTRATO_PF || documentType === DOC_TYPE_CONTRATO_PJ
        ? `Contrato de Venda e Instalação Solar - #${sale.saleNumber ?? ""}`.trim()
        : `Procuração ANEEL / Concessionária - #${sale.saleNumber ?? ""}`.trim();

    const fileName = `doc-${sale.id}-${documentType.toLowerCase()}-${Date.now()}.pdf`;
    this.documentTemplateService.savePdfToDisk(fileName, pdfBuffer);

    // Salvar registro no banco já com dados iniciais do signatário
    const saleDoc = await this.prisma.saleDocument.create({
      data: {
        saleId: sale.id,
        tenantId,
        templateType: documentType,
        title: docTitle,
        originalPdfUrl: `/uploads/sales-documents/${fileName}`,
        originalPdfHash: sha256Hash,
        status: DOC_STATUS_PENDING,
        signerName,
        signerCpf: signerCpf !== "—" ? signerCpf : null,
        signerEmail: lead?.email ?? null,
      },
    });

    // Se o status da venda era AWAITING_ANALYSIS, atualizar para DOCUMENTS_PENDING
    if (sale.status === SALE_STATUS_AWAITING) {
      await this.prisma.sale.update({
        where: { id: sale.id },
        data: { status: SALE_STATUS_DOCS_PENDING },
      });
    }

    return formatSaleDocument(saleDoc as unknown as Record<string, unknown>);
  }
}
