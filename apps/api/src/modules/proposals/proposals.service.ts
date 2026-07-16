import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, ProposalTemplate } from "@prisma/client";
import { isProposalIntegratorSnapshot } from "@energivia/shared-types";
import { Logger } from "@nestjs/common";
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
}
