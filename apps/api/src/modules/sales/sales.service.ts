import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
  Inject,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CustomerType, SaleStatus, DocumentType, DocumentSignStatus } from "@prisma/client";
import { UpdateSaleDto } from "./dto/update-sale.dto";
import { QuerySalesDto } from "./dto/query-sales.dto";
import { DocumentTemplateService } from "./document-template.service";
import { CONTRACT_PF_TEMPLATE } from "./templates/contract-pf.template";
import { POWER_OF_ATTORNEY_PF_TEMPLATE } from "./templates/power-of-attorney-pf.template";

// Módulo de Vendas e Gestão de Contratos Digitais (v1.0.2)
const CUSTOMER_TYPE_PF = (CustomerType?.PF ?? "PF") as CustomerType;
const CUSTOMER_TYPE_PJ = (CustomerType?.PJ ?? "PJ") as CustomerType;
const SALE_STATUS_AWAITING = (SaleStatus?.AWAITING_ANALYSIS ?? "AWAITING_ANALYSIS") as SaleStatus;
const SALE_STATUS_DOCS_PENDING = (SaleStatus?.DOCUMENTS_PENDING ??
  "DOCUMENTS_PENDING") as SaleStatus;
const SALE_STATUS_CANCELED = (SaleStatus?.CANCELED ?? "CANCELED") as SaleStatus;
const DOC_STATUS_PENDING = (DocumentSignStatus?.PENDING ?? "PENDING") as DocumentSignStatus;
const DOC_STATUS_SIGNED = (DocumentSignStatus?.SIGNED ?? "SIGNED") as DocumentSignStatus;
const DOC_TYPE_CONTRATO_PF = (DocumentType?.CONTRATO_PF ?? "CONTRATO_PF") as DocumentType;
const DOC_TYPE_CONTRATO_PJ = (DocumentType?.CONTRATO_PJ ?? "CONTRATO_PJ") as DocumentType;
const DOC_TYPE_PROCURACAO_PF = (DocumentType?.PROCURACAO_PF ?? "PROCURACAO_PF") as DocumentType;
const DOC_TYPE_PROCURACAO_PJ = (DocumentType?.PROCURACAO_PJ ?? "PROCURACAO_PJ") as DocumentType;

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
            lead: {
              include: {
                energyBills: {
                  where: { extractionStatus: "COMPLETED", deletedAt: null },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
        simulation: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException("Proposta não encontrada.");
    }

    if (proposal.sale) {
      if (proposal.dealId && proposal.deal?.stage !== "WON") {
        await this.prisma.deal
          .update({
            where: { id: proposal.dealId },
            data: {
              stage: "WON",
              temperature: "HOT",
              lastContactAt: new Date(),
              lostReason: null,
            },
          })
          .catch(() => {});
      }
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

    const latestBill = (
      proposal.deal?.lead as unknown as { energyBills?: Array<{ extractedData?: unknown }> }
    )?.energyBills?.[0];
    const extBill = (latestBill?.extractedData as Record<string, unknown> | null) ?? null;
    const rawExtBill = (extBill?.["rawData"] as Record<string, unknown> | null) ?? null;
    const billDist =
      (extBill?.["distribuidora"] as string) ||
      (extBill?.["provider"] as string) ||
      (rawExtBill?.["distribuidora"] as string) ||
      (rawExtBill?.["provider"] as string) ||
      null;
    const billUc =
      (extBill?.["codigo_instalacao_ou_uc"] as string) ||
      (extBill?.["consumerUnitNumber"] as string) ||
      (extBill?.["ucNumber"] as string) ||
      (rawExtBill?.["codigo_instalacao_ou_uc"] as string) ||
      (rawExtBill?.["consumerUnitNumber"] as string) ||
      (rawExtBill?.["ucNumber"] as string) ||
      null;

    const distributionCompany =
      (typeof simInput["distributor"] === "string" && simInput["distributor"].trim()
        ? simInput["distributor"].trim()
        : null) ||
      (typeof simInput["distributionCompany"] === "string" && simInput["distributionCompany"].trim()
        ? simInput["distributionCompany"].trim()
        : null) ||
      (typeof sizing["distributor"] === "string" && sizing["distributor"].trim()
        ? sizing["distributor"].trim()
        : null) ||
      (typeof sizing["distribuidora"] === "string" && sizing["distribuidora"].trim()
        ? sizing["distribuidora"].trim()
        : null) ||
      (typeof rawIntegrator?.["distributorCompany"] === "string" &&
      (rawIntegrator["distributorCompany"] as string).trim()
        ? (rawIntegrator["distributorCompany"] as string).trim()
        : null) ||
      billDist ||
      null;

    const consumerUnitNumber =
      (typeof simInput["consumerUnitNumber"] === "string" && simInput["consumerUnitNumber"].trim()
        ? simInput["consumerUnitNumber"].trim()
        : null) ||
      (typeof simInput["ucNumber"] === "string" && simInput["ucNumber"].trim()
        ? simInput["ucNumber"].trim()
        : null) ||
      (typeof sizing["consumerUnitNumber"] === "string" && sizing["consumerUnitNumber"].trim()
        ? sizing["consumerUnitNumber"].trim()
        : null) ||
      (typeof sizing["ucNumber"] === "string" && sizing["ucNumber"].trim()
        ? sizing["ucNumber"].trim()
        : null) ||
      (typeof sizing["codigo_instalacao_ou_uc"] === "string" &&
      sizing["codigo_instalacao_ou_uc"].trim()
        ? sizing["codigo_instalacao_ou_uc"].trim()
        : null) ||
      (typeof rawIntegrator?.["consumerUnitNumber"] === "string" &&
      (rawIntegrator["consumerUnitNumber"] as string).trim()
        ? (rawIntegrator["consumerUnitNumber"] as string).trim()
        : null) ||
      billUc ||
      null;

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
        distributionCompany,
        consumerUnitNumber,
        systemPowerKwp,
        investmentAmount,
        sellerName,
      },
    });

    // Se a proposta estava em DRAFT ou SENT, atualizar para ACCEPTED automaticamente
    const now = new Date();
    try {
      if (proposal.status !== "ACCEPTED") {
        await this.prisma.proposal.update({
          where: { id: proposal.id },
          data: {
            status: "ACCEPTED",
            clientDecision: "ACCEPT",
            clientDecisionAt: now,
          },
        });
      }
    } catch (err) {
      this.logger.warn(
        `Não foi possível atualizar status da proposta ${proposal.id} para ACCEPTED: ${err}`
      );
    }

    // Avançar a Negociação (Deal) do cliente para o estágio WON ("Fechado / Ganho")
    try {
      if (proposal.dealId) {
        await this.prisma.deal.update({
          where: { id: proposal.dealId },
          data: {
            stage: "WON",
            temperature: "HOT",
            lastContactAt: now,
            lostReason: null,
          },
        });

        if (proposal.deal?.leadId) {
          await this.prisma.leadActivityLog.create({
            data: {
              tenantId,
              leadId: proposal.deal.leadId,
              kind: "PROPOSAL_ACCEPTED",
              label: "Proposta aceita e convertida em venda",
              meta: {
                proposalId: proposal.id,
                saleId: sale.id,
                saleNumber: sale.saleNumber,
              },
              occurredAt: now,
            },
          });
        }
      }
    } catch (err) {
      this.logger.warn(
        `Não foi possível avançar o deal da proposta ${proposal.id} para WON: ${err}`
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
                lead: {
                  include: {
                    energyBills: {
                      where: { extractionStatus: "COMPLETED", deletedAt: null },
                      orderBy: { createdAt: "desc" },
                      take: 1,
                    },
                  },
                },
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

    const simInput = (sale.proposal?.simulation?.input as Record<string, unknown>) ?? {};
    const simResult = (sale.proposal?.simulation?.result as Record<string, unknown>) ?? {};
    const sizing = (simResult["sizing"] as Record<string, unknown>) ?? {};
    const latestBill = (
      sale.proposal?.deal?.lead as unknown as { energyBills?: Array<{ extractedData?: unknown }> }
    )?.energyBills?.[0];
    const extBill = (latestBill?.extractedData as Record<string, unknown> | null) ?? null;
    const rawExtBill = (extBill?.["rawData"] as Record<string, unknown> | null) ?? null;
    const billDist =
      (extBill?.["distribuidora"] as string) ||
      (extBill?.["provider"] as string) ||
      (rawExtBill?.["distribuidora"] as string) ||
      (rawExtBill?.["provider"] as string) ||
      null;
    const billUc =
      (extBill?.["codigo_instalacao_ou_uc"] as string) ||
      (extBill?.["consumerUnitNumber"] as string) ||
      (extBill?.["ucNumber"] as string) ||
      (rawExtBill?.["codigo_instalacao_ou_uc"] as string) ||
      (rawExtBill?.["consumerUnitNumber"] as string) ||
      (rawExtBill?.["ucNumber"] as string) ||
      null;

    return {
      ...sale,
      customerName,
      customerEmail,
      customerPhone,
      customerCpfCnpj,
      city: sale.installationCity,
      state: sale.installationState,
      utilityCompany:
        sale.distributionCompany ||
        (typeof simInput["distributor"] === "string" && simInput["distributor"].trim()
          ? simInput["distributor"].trim()
          : null) ||
        (typeof simInput["distributionCompany"] === "string" &&
        simInput["distributionCompany"].trim()
          ? simInput["distributionCompany"].trim()
          : null) ||
        (typeof sizing["distributor"] === "string" && sizing["distributor"].trim()
          ? sizing["distributor"].trim()
          : null) ||
        (typeof sizing["distribuidora"] === "string" && sizing["distribuidora"].trim()
          ? sizing["distribuidora"].trim()
          : null) ||
        (typeof rawRenderedIntegrator?.["distributorCompany"] === "string" &&
        (rawRenderedIntegrator["distributorCompany"] as string).trim()
          ? (rawRenderedIntegrator["distributorCompany"] as string).trim()
          : null) ||
        billDist ||
        null,
      ucNumber:
        sale.consumerUnitNumber ||
        (typeof simInput["consumerUnitNumber"] === "string" && simInput["consumerUnitNumber"].trim()
          ? simInput["consumerUnitNumber"].trim()
          : null) ||
        (typeof simInput["ucNumber"] === "string" && simInput["ucNumber"].trim()
          ? simInput["ucNumber"].trim()
          : null) ||
        (typeof sizing["consumerUnitNumber"] === "string" && sizing["consumerUnitNumber"].trim()
          ? sizing["consumerUnitNumber"].trim()
          : null) ||
        (typeof sizing["ucNumber"] === "string" && sizing["ucNumber"].trim()
          ? sizing["ucNumber"].trim()
          : null) ||
        (typeof sizing["codigo_instalacao_ou_uc"] === "string" &&
        sizing["codigo_instalacao_ou_uc"].trim()
          ? sizing["codigo_instalacao_ou_uc"].trim()
          : null) ||
        (typeof rawRenderedIntegrator?.["consumerUnitNumber"] === "string" &&
        (rawRenderedIntegrator["consumerUnitNumber"] as string).trim()
          ? (rawRenderedIntegrator["consumerUnitNumber"] as string).trim()
          : null) ||
        billUc ||
        null,
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

    const formattedDate = new Date().toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const signerName = lead?.name || sale.legalRepresentativeName || "Cliente";
    const signerCpf = sale.legalRepresentativeCpf || sale.documentNumber || lead?.cpfCnpj || "—";

    const data = await this.documentTemplateService.prepareContractVariables({
      sale,
      tenant,
      lead,
      formattedDate,
    });

    const html = this.documentTemplateService.buildDocumentHtml(documentType, data, tenant);
    const { pdfBuffer, sha256Hash } = await this.documentTemplateService.generatePdfWithHash(html);

    const docTitle =
      documentType === DOC_TYPE_CONTRATO_PF || documentType === DOC_TYPE_CONTRATO_PJ
        ? `Contrato de Venda e Instalação Solar - #${sale.saleNumber ?? ""}`.trim()
        : `Procuração ANEEL / Concessionária - #${sale.saleNumber ?? ""}`.trim();

    const fileName = `doc-${sale.id}-${documentType.toLowerCase()}-${Date.now()}.pdf`;
    this.documentTemplateService.savePdfToDisk(fileName, pdfBuffer);

    // Salvar registro no banco já com dados iniciais do signatário e HTML editável
    const saleDoc = await this.prisma.saleDocument.create({
      data: {
        saleId: sale.id,
        tenantId,
        templateType: documentType,
        title: docTitle,
        originalPdfUrl: `/uploads/sales-documents/${fileName}`,
        originalPdfHash: sha256Hash,
        contentHtml: html,
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

  async getDocumentForEditor(tenantId: string, saleId: string, docId: string) {
    if (!this.documentTemplateService) {
      throw new NotFoundException("Serviço de geração de documentos não inicializado.");
    }

    const doc = await this.prisma.saleDocument.findFirst({
      where: { id: docId, saleId, tenantId },
      include: {
        sale: {
          include: {
            proposal: {
              include: {
                simulation: true,
                deal: {
                  include: {
                    lead: true,
                  },
                },
              },
            },
            tenant: true,
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException("Documento não encontrado.");
    }

    let contentHtml = doc.contentHtml;
    if (!contentHtml || !contentHtml.trim()) {
      const lead = doc.sale?.proposal?.deal?.lead;
      const tenant = doc.sale?.tenant;
      const formattedDate = new Date(doc.createdAt || Date.now()).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const data = await this.documentTemplateService.prepareContractVariables({
        sale: doc.sale,
        tenant,
        lead,
        formattedDate,
      });

      contentHtml = this.documentTemplateService.buildDocumentHtml(
        doc.templateType,
        data,
        doc.sale?.tenant
      );
    }

    return {
      id: doc.id,
      saleId: doc.saleId,
      templateType: doc.templateType,
      title: doc.title,
      status: doc.status,
      isSigned: doc.status === DOC_STATUS_SIGNED,
      publicToken: doc.publicToken,
      contentHtml,
      originalPdfUrl: doc.originalPdfUrl,
      updatedAt: doc.updatedAt,
    };
  }

  async updateDocumentContent(
    tenantId: string,
    saleId: string,
    docId: string,
    contentHtml: string
  ) {
    if (!this.documentTemplateService) {
      throw new NotFoundException("Serviço de geração de documentos não inicializado.");
    }

    if (!contentHtml || typeof contentHtml !== "string" || !contentHtml.trim()) {
      throw new BadRequestException("O conteúdo do documento não pode estar vazio.");
    }

    const doc = await this.prisma.saleDocument.findFirst({
      where: { id: docId, saleId, tenantId },
    });

    if (!doc) {
      throw new NotFoundException("Documento não encontrado.");
    }

    if (doc.status === DOC_STATUS_SIGNED) {
      throw new BadRequestException(
        "Documentos já assinados possuem integridade jurídica e não podem ser editados."
      );
    }

    const template = String(doc.templateType).startsWith("CONTRATO")
      ? CONTRACT_PF_TEMPLATE
      : POWER_OF_ATTORNEY_PF_TEMPLATE;
    const headMatch = template.match(/<head[\s\S]*?<\/head>/i);
    const headHtml = headMatch ? headMatch[0] : "<head><meta charset='UTF-8'></head>";
    let cleanBody = contentHtml
      .replace(/<head[\s\S]*?<\/head>/gi, "")
      .replace(/<\/?(html|body|!DOCTYPE)[^>]*>/gi, "")
      .trim();

    cleanBody = cleanBody
      .replace(
        /<div class="page-break"[^>]*><\/div>\s*(?=(?:<!--\s*5\.|<div class="section-title">\s*5\.))/gi,
        ""
      )
      .replace(
        /<div class="page-break"[^>]*><\/div>\s*(?=(?:<!--\s*9\.|<div class="section-title">\s*9\.))/gi,
        ""
      )
      .replace(
        /<div class="page-break"[^>]*><\/div>\s*(?=(?:<!--\s*15\.|<div class="section-title">\s*15\.))/gi,
        ""
      );

    const finalHtml = `<!DOCTYPE html>\n<html lang="pt-BR">\n${headHtml}\n<body>\n${cleanBody}\n</body>\n</html>`;

    const { pdfBuffer, sha256Hash } =
      await this.documentTemplateService.generatePdfWithHash(finalHtml);

    const fileName = `doc-${doc.saleId}-${doc.templateType.toLowerCase()}-${Date.now()}.pdf`;
    this.documentTemplateService.savePdfToDisk(fileName, pdfBuffer);

    const updatedDoc = await this.prisma.saleDocument.update({
      where: { id: doc.id },
      data: {
        contentHtml: finalHtml,
        originalPdfUrl: `/uploads/sales-documents/${fileName}`,
        originalPdfHash: sha256Hash,
      },
    });

    return {
      id: updatedDoc.id,
      title: updatedDoc.title,
      contentHtml: updatedDoc.contentHtml,
      originalPdfUrl: updatedDoc.originalPdfUrl,
      originalPdfHash: updatedDoc.originalPdfHash,
      status: updatedDoc.status,
    };
  }

  async deleteSaleDocument(tenantId: string, saleId: string, docId: string) {
    const doc = await this.prisma.saleDocument.findFirst({
      where: { id: docId, saleId, tenantId },
    });

    if (!doc) {
      throw new NotFoundException("Documento não encontrado.");
    }

    if (doc.status === DOC_STATUS_SIGNED) {
      throw new BadRequestException(
        "Documentos já assinados possuem validade jurídica probatória e não podem ser excluídos."
      );
    }

    await this.prisma.saleDocument.delete({
      where: { id: doc.id },
    });

    return {
      success: true,
      message: "Minuta excluída com sucesso.",
    };
  }

  async getGlobalDocumentTemplates(tenantId: string) {
    if (!this.documentTemplateService) {
      throw new NotFoundException("Serviço de geração de documentos não inicializado.");
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, settings: true },
    });

    if (!tenant) {
      throw new NotFoundException("Organização não encontrada.");
    }

    const settings = (tenant.settings as Record<string, unknown>) || {};
    const customTemplates = (settings["customDocumentTemplates"] as Record<string, string>) || {};

    const defaultContrato =
      this.documentTemplateService.getFactoryDefaultTemplate(DOC_TYPE_CONTRATO_PF);
    const defaultProcuracao =
      this.documentTemplateService.getFactoryDefaultTemplate(DOC_TYPE_PROCURACAO_PF);

    const contratoCustom = customTemplates[DOC_TYPE_CONTRATO_PF];
    const procuracaoCustom = customTemplates[DOC_TYPE_PROCURACAO_PF];

    return {
      templates: {
        CONTRATO_PF: {
          documentType: DOC_TYPE_CONTRATO_PF,
          title: "Contrato de Compra e Venda Solar",
          contentHtml:
            contratoCustom && contratoCustom.trim().length > 0 ? contratoCustom : defaultContrato,
          isCustom: Boolean(contratoCustom && contratoCustom.trim().length > 0),
          factoryDefaultHtml: defaultContrato,
        },
        PROCURACAO_PF: {
          documentType: DOC_TYPE_PROCURACAO_PF,
          title: "Procuração de Homologação ANEEL",
          contentHtml:
            procuracaoCustom && procuracaoCustom.trim().length > 0
              ? procuracaoCustom
              : defaultProcuracao,
          isCustom: Boolean(procuracaoCustom && procuracaoCustom.trim().length > 0),
          factoryDefaultHtml: defaultProcuracao,
        },
      },
      availableVariables: this.documentTemplateService.getAvailableTemplateVariables(),
    };
  }

  async updateGlobalDocumentTemplate(
    tenantId: string,
    documentType: DocumentType,
    contentHtml: string
  ) {
    if (!this.documentTemplateService) {
      throw new NotFoundException("Serviço de geração de documentos não inicializado.");
    }

    if (!contentHtml || typeof contentHtml !== "string" || !contentHtml.trim()) {
      throw new BadRequestException("O conteúdo HTML do modelo não pode estar vazio.");
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, settings: true },
    });

    if (!tenant) {
      throw new NotFoundException("Organização não encontrada.");
    }

    const currentSettings = (tenant.settings as Record<string, unknown>) || {};
    const currentCustom =
      (currentSettings["customDocumentTemplates"] as Record<string, string>) || {};

    const factoryDefault = this.documentTemplateService.getFactoryDefaultTemplate(documentType);
    const headMatch = factoryDefault.match(/<head[\s\S]*?<\/head>/i);
    const headHtml = headMatch ? headMatch[0] : "<head><meta charset='UTF-8'></head>";

    let cleanBody = contentHtml
      .replace(/<head[\s\S]*?<\/head>/gi, "")
      .replace(/<\/?(html|body|!DOCTYPE)[^>]*>/gi, "")
      .trim();

    cleanBody = cleanBody
      .replace(
        /<div class="page-break"[^>]*><\/div>\s*(?=(?:<!--\s*5\.|<div class="section-title">\s*5\.))/gi,
        ""
      )
      .replace(
        /<div class="page-break"[^>]*><\/div>\s*(?=(?:<!--\s*9\.|<div class="section-title">\s*9\.))/gi,
        ""
      )
      .replace(
        /<div class="page-break"[^>]*><\/div>\s*(?=(?:<!--\s*15\.|<div class="section-title">\s*15\.))/gi,
        ""
      );

    const normalizedHtml = `<!DOCTYPE html>\n<html lang="pt-BR">\n${headHtml}\n<body>\n${cleanBody}\n</body>\n</html>`;

    const nextCustom = {
      ...currentCustom,
      [documentType]: normalizedHtml,
    };

    if (documentType === DOC_TYPE_CONTRATO_PF) {
      nextCustom[DOC_TYPE_CONTRATO_PJ] = normalizedHtml;
    } else if (documentType === DOC_TYPE_PROCURACAO_PF) {
      nextCustom[DOC_TYPE_PROCURACAO_PJ] = normalizedHtml;
    }

    const updatedSettings = {
      ...currentSettings,
      customDocumentTemplates: nextCustom,
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings },
    });

    return {
      success: true,
      documentType,
      isCustom: true,
      message: "Modelo padrão global atualizado com sucesso.",
    };
  }

  async resetGlobalDocumentTemplate(tenantId: string, documentType: DocumentType) {
    if (!this.documentTemplateService) {
      throw new NotFoundException("Serviço de geração de documentos não inicializado.");
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, settings: true },
    });

    if (!tenant) {
      throw new NotFoundException("Organização não encontrada.");
    }

    const currentSettings = (tenant.settings as Record<string, unknown>) || {};
    const currentCustom = {
      ...((currentSettings["customDocumentTemplates"] as Record<string, string>) || {}),
    };

    delete currentCustom[documentType];
    if (documentType === DOC_TYPE_CONTRATO_PF) {
      delete currentCustom[DOC_TYPE_CONTRATO_PJ];
    } else if (documentType === DOC_TYPE_PROCURACAO_PF) {
      delete currentCustom[DOC_TYPE_PROCURACAO_PJ];
    }

    const updatedSettings = {
      ...currentSettings,
      customDocumentTemplates: currentCustom,
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings },
    });

    const factoryDefault = this.documentTemplateService.getFactoryDefaultTemplate(documentType);

    return {
      success: true,
      documentType,
      isCustom: false,
      contentHtml: factoryDefault,
      message: "Modelo padrão restaurado para a versão de fábrica com sucesso.",
    };
  }
}
