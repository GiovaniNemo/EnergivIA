import { Injectable, NotFoundException, Logger, Optional, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CustomerType, SaleStatus, DocumentType, DocumentSignStatus } from "@prisma/client";
import { UpdateSaleDto } from "./dto/update-sale.dto";
import { QuerySalesDto } from "./dto/query-sales.dto";
import { DocumentTemplateService } from "./document-template.service";

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

    const investmentAmount =
      Number(simInput["investmentAmount"]) || Number(simInput["valorTotal"]) || 0;

    // Determinar se é PF ou PJ
    const rawDoc = lead?.cpfCnpj?.replace(/\D/g, "") ?? "";
    const isPj = rawDoc.length > 11 || Boolean(lead?.company);
    const customerType = isPj ? CustomerType.PJ : CustomerType.PF;

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
        status: SaleStatus.AWAITING_ANALYSIS,
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
            },
          },
        },
      }),
      this.prisma.sale.count({ where }),
    ]);

    const mappedItems = items.map((sale) => ({
      ...sale,
      documents: sale.documents?.map((d) =>
        formatSaleDocument(d as unknown as Record<string, unknown>)
      ),
    }));

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

    return {
      ...sale,
      ...(lead?.name && { customerName: lead.name }),
      ...(lead?.email && { customerEmail: lead.email }),
      ...(lead?.whatsapp && { customerPhone: lead.whatsapp }),
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

    // Se forneceu customerName, customerEmail, etc., atualizar no Lead vinculado
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
            ...(dto.customerPhone && { phone: dto.customerPhone }),
            ...(dto.customerCpfCnpj && { cpfCnpj: dto.customerCpfCnpj }),
          },
        });
      } catch (err) {
        this.logger.warn(`Falha ao atualizar dados do lead na venda ${id}: ${err}`);
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
              ? SaleStatus.CANCELED
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

    const formattedDate = new Date().toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const formattedInvestment = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(sale.investmentAmount);

    const data: Record<string, string | number | undefined | null> = {
      nome_cliente: lead?.name ?? "Cliente",
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
      documentType === DocumentType.CONTRATO_PF || documentType === DocumentType.CONTRATO_PJ
        ? `Contrato de Venda e Instalação Solar - #${sale.saleNumber ?? ""}`.trim()
        : `Procuração ANEEL / Concessionária - #${sale.saleNumber ?? ""}`.trim();

    const fileName = `doc-${sale.id}-${documentType.toLowerCase()}-${Date.now()}.pdf`;
    this.documentTemplateService.savePdfToDisk(fileName, pdfBuffer);

    // Salvar registro no banco
    const saleDoc = await this.prisma.saleDocument.create({
      data: {
        saleId: sale.id,
        tenantId,
        templateType: documentType,
        title: docTitle,
        originalPdfUrl: `/uploads/sales-documents/${fileName}`,
        originalPdfHash: sha256Hash,
        status: DocumentSignStatus.PENDING,
      },
    });

    // Se o status da venda era AWAITING_ANALYSIS, atualizar para DOCUMENTS_PENDING
    if (sale.status === SaleStatus.AWAITING_ANALYSIS) {
      await this.prisma.sale.update({
        where: { id: sale.id },
        data: { status: SaleStatus.DOCUMENTS_PENDING },
      });
    }

    return formatSaleDocument(saleDoc as unknown as Record<string, unknown>);
  }
}
