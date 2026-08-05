import { randomUUID } from "node:crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BadRequestException, Injectable, NotFoundException, Logger } from "@nestjs/common";
import type { Prisma, ProposalTemplate } from "@prisma/client";
import { isProposalIntegratorSnapshot } from "@energivia/shared-types";
import { PROJECT_COST_ESSENTIAL_MARGIN_NAME } from "@energivia/proposal-economia";
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";

import { PrismaService } from "../../prisma/prisma.service";
import { softDeleteWhere as soft } from "../../prisma/soft-delete";
import { LeadActivityLogService } from "../lead-activity-log/lead-activity-log.service";
import { NotificationsService } from "../notifications/notifications.service";
import { StockReservationService } from "../stock/stock-reservation.service";

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function readInvestmentFromSimulationInput(input: unknown): number | null {
  if (!input || typeof input !== "object") return null;
  return readFiniteNumber((input as Record<string, unknown>)["investmentAmount"]);
}

function parseIntegratorFromRendered(renderedData: unknown) {
  if (!renderedData || typeof renderedData !== "object") return null;
  const int = (renderedData as { integrator?: unknown }).integrator;
  return isProposalIntegratorSnapshot(int) ? int : null;
}

function simulationHasEmbeddedSizing(simulation: { result: unknown }): boolean {
  const res = simulation.result;
  if (!res || typeof res !== "object") return false;
  const sz = (res as Record<string, unknown>)["sizing"];
  return (
    sz != null &&
    typeof sz === "object" &&
    typeof (sz as Record<string, unknown>)["recommendedPowerKw"] === "number"
  );
}

async function findPublishedTemplateRow(
  prisma: PrismaService,
  tenantId: string
): Promise<ProposalTemplate | null> {
  return prisma.proposalTemplate.findFirst({
    where: { tenantId, status: "PUBLISHED", deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
}

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly leadActivityLog: LeadActivityLogService,
    private readonly stockReservation: StockReservationService
  ) {}

  async list(tenantId: string) {
    const rows = await this.prisma.proposal.findMany({
      where: { tenantId, ...soft },
      include: {
        deal: {
          include: {
            lead: true,
          },
        },
        simulation: { select: { input: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((p) => {
      const integrator = parseIntegratorFromRendered(p.renderedData);
      const inv = readInvestmentFromSimulationInput(p.simulation?.input);
      const quoted =
        integrator != null && typeof integrator.quotedSaleBrl === "number"
          ? integrator.quotedSaleBrl
          : inv;
      const equip =
        integrator != null && typeof integrator.equipmentSubtotalBrl === "number"
          ? integrator.equipmentSubtotalBrl
          : null;
      const hasKit = Boolean(
        integrator && (integrator.kitItems.length > 0 || (integrator.equipmentSubtotalBrl ?? 0) > 0)
      );
      const margin =
        quoted != null && equip != null && hasKit ? Math.round((quoted - equip) * 100) / 100 : null;

      return {
        id: p.id,
        title: p.title,
        status: p.status,
        validUntil: p.validUntil,
        pdfUrl: p.pdfUrl,
        createdAt: p.createdAt,
        deal: p.deal,
        quotedValueBrl: quoted,
        equipmentSubtotalBrl: hasKit ? equip : null,
        marginBrl: margin,
        kitLineCount: integrator?.kitItems?.length ?? 0,
      };
    });
  }

  async create(
    tenantId: string,
    data: {
      dealId: string;
      simulationId: string;
      title: string;
      validUntil: Date;
      proposalTemplateId?: string;
      renderedData?: Record<string, unknown>;
      discountBrl?: number;
    }
  ) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: data.dealId, tenantId, ...soft },
    });
    if (!deal) throw new NotFoundException("Negociação não encontrada.");

    const simulation = await this.prisma.simulation.findFirst({
      where: {
        id: data.simulationId,
        tenantId,
        leadId: deal.leadId,
        ...soft,
      },
    });

    if (!simulation) {
      throw new BadRequestException(
        "É necessária uma simulação financeira para o lead desta negociação."
      );
    }

    if (!simulationHasEmbeddedSizing(simulation)) {
      throw new BadRequestException(
        "A simulação precisa incluir dimensionamento (consumo). Salve novamente o estudo na ficha do cliente."
      );
    }

    let proposalTemplateId = data.proposalTemplateId;
    let templateVersion: number | undefined;
    const explicitTemplate = proposalTemplateId
      ? await this.prisma.proposalTemplate.findFirst({
          where: {
            id: proposalTemplateId,
            tenantId,
            deletedAt: null,
          },
        })
      : null;
    if (explicitTemplate) {
      templateVersion = explicitTemplate.version;
    } else if (!proposalTemplateId) {
      const defaultTemplate = await this.prisma.proposalTemplate.findFirst({
        where: {
          tenantId,
          status: "PUBLISHED",
          isDefault: true,
          deletedAt: null,
        },
        orderBy: { updatedAt: "desc" },
      });
      if (defaultTemplate) {
        proposalTemplateId = defaultTemplate.id;
        templateVersion = defaultTemplate.version;
      } else {
        const anyPublished = await findPublishedTemplateRow(this.prisma, tenantId);
        if (anyPublished) {
          proposalTemplateId = anyPublished.id;
          templateVersion = anyPublished.version;
        }
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.create({
        data: {
          tenantId,
          dealId: data.dealId,
          simulationId: data.simulationId,
          proposalTemplateId,
          proposalTemplateVersion: templateVersion,
          title: data.title,
          validUntil: data.validUntil,
          status: "DRAFT",
          ...(data.renderedData !== undefined
            ? { renderedData: data.renderedData as Prisma.InputJsonValue }
            : {}),
          ...(typeof data.discountBrl === "number" && data.discountBrl > 0
            ? { discountBrl: data.discountBrl }
            : {}),
        },
      });
      await this.stockReservation.reserveFromRenderedInTx(
        tx,
        tenantId,
        proposal.id,
        data.renderedData
      );
      return proposal;
    });
    this.leadActivityLog
      .append({
        tenantId,
        leadId: deal.leadId,
        kind: "PROPOSAL_CREATED",
        label: `Proposta criada (${data.title})`,
        meta: { proposalId: created.id, dealId: data.dealId },
        occurredAt: created.createdAt,
      })
      .catch(() => {});
    return created;
  }

  async findByDeal(tenantId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, tenantId, ...soft },
    });
    if (!deal) throw new NotFoundException("Negociação não encontrada.");

    return this.prisma.proposal.findMany({
      where: { tenantId, dealId, ...soft },
      include: {
        simulation: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(tenantId: string, id: string) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, tenantId, ...soft },
      include: {
        deal: { include: { lead: true } },
        simulation: true,
        proposalTemplate: true,
      },
    });
    if (!proposal) throw new NotFoundException("Proposta não encontrada.");
    return proposal;
  }

  async findPublicById(idOrToken: string) {
    try {
      const proposal = await this.prisma.proposal.findFirst({
        where: {
          OR: [{ publicToken: idOrToken }, { publicToken: null, id: idOrToken }],
          ...soft,
        },
        include: {
          deal: { include: { lead: true } },
          simulation: true,
          proposalTemplate: true,
          tenant: { select: { name: true } },
        },
      });
      if (!proposal) throw new NotFoundException("Proposta não encontrada.");
      let template = proposal.proposalTemplate;
      if (!template) {
        template = await findPublishedTemplateRow(this.prisma, proposal.tenantId);
      }
      await this.notificationsService.handlePublicProposalView(proposal.id);
      return {
        id: proposal.id,
        title: proposal.title,
        validUntil: proposal.validUntil,
        createdAt: proposal.createdAt,
        discountBrl: proposal.discountBrl ?? null,
        companyName: proposal.tenant?.name ?? null,
        deal: { lead: { name: proposal.deal.lead.name } },
        simulation: proposal.simulation
          ? { input: proposal.simulation.input, result: proposal.simulation.result }
          : null,
        proposalTemplate: template
          ? { id: template.id, name: template.name, config: template.config }
          : null,
      };
    } catch (e) {
      this.logger.warn(
        `Failed to load public proposal: ${e instanceof Error ? e.message : String(e)}`
      );
      return null;
    }
  }

  async updatePdfUrl(tenantId: string, id: string, pdfUrl: string) {
    const before = await this.prisma.proposal.findFirst({
      where: { id, tenantId, ...soft },
      include: { deal: { select: { leadId: true } } },
    });
    if (!before) throw new NotFoundException("Proposta não encontrada.");

    const updated = await this.prisma.proposal.update({
      where: { id },
      data: { pdfUrl, status: "SENT", sentAt: new Date() },
    });

    if (before.status === "DRAFT" && before.deal) {
      await this.leadActivityLog.append({
        tenantId,
        leadId: before.deal.leadId,
        kind: "PROPOSAL_SENT",
        label: `Proposta enviada (${before.title})`,
        meta: { proposalId: id },
        occurredAt: updated.sentAt ?? new Date(),
      });
    }

    return updated;
  }

  async updateDiscount(tenantId: string, id: string, discountBrl: number | null) {
    await this.findOne(tenantId, id);
    if (discountBrl != null && (!Number.isFinite(discountBrl) || discountBrl < 0)) {
      throw new BadRequestException("Desconto inválido.");
    }
    const normalized = discountBrl != null && discountBrl > 0 ? discountBrl : null;
    const nextPublicToken = randomUUID();
    const updated = await this.prisma.proposal.update({
      where: { id },
      data: { discountBrl: normalized, publicToken: nextPublicToken },
    });
    return {
      id: updated.id,
      discountBrl: updated.discountBrl ?? null,
      publicToken: nextPublicToken,
    };
  }

  async updateMarginOverride(tenantId: string, id: string, marginBrl: number) {
    const proposal = await this.findOne(tenantId, id);
    if (!Number.isFinite(marginBrl) || marginBrl < 0) {
      throw new BadRequestException("Margem inválida.");
    }

    const integrator = parseIntegratorFromRendered(proposal.renderedData);
    if (!integrator) {
      throw new BadRequestException("Proposta não possui dados de integrador para alterar margem.");
    }

    const projectCostLines = integrator.projectCostLines ?? [];
    const marginIndex = projectCostLines.findIndex(
      (l) => l.name === PROJECT_COST_ESSENTIAL_MARGIN_NAME
    );

    if (marginIndex >= 0) {
      const marginLine = projectCostLines[marginIndex];
      if (marginLine) {
        marginLine.calculationType = "FIXED";
        marginLine.value = marginBrl;
        marginLine.appliedAmountBrl = marginBrl;
        marginLine.source = "organization";
      }
    } else {
      projectCostLines.push({
        name: PROJECT_COST_ESSENTIAL_MARGIN_NAME,
        calculationType: "FIXED",
        value: marginBrl,
        appliedAmountBrl: marginBrl,
        source: "organization",
      });
    }

    integrator.projectCostLines = projectCostLines;

    const equipmentTotal = integrator.equipmentSubtotalBrl ?? 0;
    const costsTotal = projectCostLines.reduce(
      (acc, curr) => acc + (curr.appliedAmountBrl ?? 0),
      0
    );
    const newQuotedSaleBrl = equipmentTotal + costsTotal;

    integrator.computedSaleFromCostRulesBrl = newQuotedSaleBrl;
    integrator.quotedSaleBrl = newQuotedSaleBrl;

    const nextPublicToken = randomUUID();
    const renderedData = {
      ...(proposal.renderedData as Record<string, unknown>),
      integrator,
    };

    const updated = await this.prisma.proposal.update({
      where: { id },
      data: {
        renderedData: renderedData as unknown as Prisma.InputJsonValue,
        publicToken: nextPublicToken,
      },
    });

    return {
      id: updated.id,
      publicToken: nextPublicToken,
    };
  }

  async setTemplate(tenantId: string, id: string, proposalTemplateId: string | null) {
    await this.findOne(tenantId, id);

    if (!proposalTemplateId) {
      return this.prisma.proposal.update({
        where: { id },
        data: { proposalTemplateId: null, proposalTemplateVersion: null },
      });
    }

    const template = await this.prisma.proposalTemplate.findFirst({
      where: { id: proposalTemplateId, tenantId, deletedAt: null },
    });
    if (!template) throw new NotFoundException("Modelo de proposta não encontrado.");

    return this.prisma.proposal.update({
      where: { id },
      data: { proposalTemplateId: template.id, proposalTemplateVersion: template.version },
    });
  }

  async softDelete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.stockReservation.releaseForProposal(tenantId, id).catch((e) => {
      this.logger.error(`Falha ao liberar reserva da proposta ${id}: ${String(e)}`);
    });
    return this.prisma.proposal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async chatGetProposalSummary(tenantId: string, proposalId: string) {
    const p = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId, ...soft },
      select: {
        id: true,
        title: true,
        status: true,
        validUntil: true,
        createdAt: true,
        pdfUrl: true,
        sentAt: true,
        dealId: true,
        deal: {
          select: {
            id: true,
            title: true,
            stage: true,
            lead: { select: { id: true, name: true, whatsapp: true } },
          },
        },
      },
    });
    if (!p) throw new NotFoundException("Proposta não encontrada.");
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      validUntil: p.validUntil.toISOString(),
      createdAt: p.createdAt.toISOString(),
      sentAt: p.sentAt?.toISOString() ?? null,
      hasPdf: Boolean(p.pdfUrl?.trim()),
      internalUrl: `/propostas/${p.id}`,
      deal: p.deal
        ? {
            id: p.deal.id,
            title: p.deal.title,
            stage: p.deal.stage,
            lead: p.deal.lead,
          }
        : null,
    };
  }

  async generatePdf(proposalId: string): Promise<Buffer> {
    // 1. Busca a proposta para pegar o Token Público
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { id: true, publicToken: true }, // Pegamos apenas o que precisamos
    });

    if (!proposal) {
      throw new BadRequestException("Proposta não encontrada para gerar PDF.");
    }

    const webBaseUrl = process.env["PUBLIC_WEB_APP_BASE_URL"] || "https://www.energivia.com.br";

    // 2. Usa o token público (se existir) ou o ID como fallback
    const token = proposal.publicToken || proposal.id;

    // ATENÇÃO: Verifique se a rota do seu frontend para o cliente final é "/proposta/" mesmo
    // ou se é algo como "/p/", "/proposta/publica/", etc.
    const targetUrl = `${webBaseUrl}/proposta/${token}`;

    this.logger.log(`Iniciando geração de PDF para a proposta ${proposalId} na URL: ${targetUrl}`);

    // Identifica se está rodando localmente (Windows/Mac) ou na Vercel/Railway (Linux)
    const isLocal = process.platform === "win32" || process.platform === "darwin";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let browser: any = null;

    try {
      if (isLocal) {
        // AMBIENTE LOCAL: Importa dinamicamente o puppeteer normal
        const puppeteerLocal = await import("puppeteer");
        browser = await puppeteerLocal.default.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
      } else {
        // AMBIENTE NUVEM (VERCEL): Usa o puppeteer-core + sparticuz/chromium
        browser = await puppeteerCore.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        });
      }

      const page = await browser.newPage();

      await page.goto(targetUrl, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "10mm",
          right: "10mm",
          bottom: "10mm",
          left: "10mm",
        },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`Erro ao gerar PDF da proposta ${proposalId}: ${String(error)}`);
      throw new BadRequestException("Não foi possível gerar o PDF da proposta.");
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async generateAiSection(prompt: string, contextText?: string) {
    const apiKey = process.env["GEMINI_API_KEY"] ?? process.env["GOOGLE_GENERATIVE_AI_API_KEY"];
    if (!apiKey) {
      throw new BadRequestException("Serviço de IA não configurado (chave ausente).");
    }

    try {
      const model = process.env["GEMINI_TEXT_MODEL"] ?? "gemini-2.5-flash";
      const genAI = new GoogleGenerativeAI(apiKey);
      const genModel = genAI.getGenerativeModel({
        model,
        generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
        systemInstruction: `Você é um especialista em vendas e marketing de energia solar fotovoltaica. 
Seu trabalho é gerar conteúdos persuasivos, claros e profissionais para seções de propostas comerciais.
Você DEVE retornar um JSON válido com exatamente estas DUAS chaves:
{
  "title": "Título sugerido para a seção",
  "text": "O conteúdo da seção renderizado em HTML puro. Use estruturação limpa (p, strong, ul/li, u, br). Não use tags h1/h2 no texto, apenas parágrafos bem escritos e listas."
}
O usuário descreverá a seção que deseja. Adapte o tom.`,
      });

      const userInput = `Contexto da proposta: ${contextText ?? "Nenhum especifico."}
O usuário solicitou uma seção com a seguinte instrução: ${prompt}`;

      const result = await genModel.generateContent(userInput);
      const text = result.response.text();
      // O modelo já está forçado a JSON, apenas devolvemos parseado
      return JSON.parse(text);
    } catch (error: unknown) {
      this.logger.error(`Erro ao chamar Gemini: ${String(error)}`);
      throw new BadRequestException("Falha ao gerar seção com IA. Tente novamente mais tarde.");
    }
  }
}
