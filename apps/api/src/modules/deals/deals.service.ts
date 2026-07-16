import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Deal, Prisma } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { assertLeadInTenant } from "../../common/assert-lead-in-tenant";
import { LeadActivityLogService } from "../lead-activity-log/lead-activity-log.service";
import { StockReservationService } from "../stock/stock-reservation.service";
import { PrismaService } from "../../prisma/prisma.service";
import { softDeleteWhere as soft } from "../../prisma/soft-delete";
import type { CreateDealDto } from "./dto/create-deal.dto";
import type { UpdateDealDto } from "./dto/update-deal.dto";
import type { DealFocusItemDto, DealFocusSuggestion } from "./dto/deal-focus.dto";

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadActivityLog: LeadActivityLogService,
    private readonly stockReservation: StockReservationService
  ) {}

  private async assertLead(tenantId: string, leadId: string): Promise<void> {
    await assertLeadInTenant(this.prisma, tenantId, leadId);
  }

  async create(tenantId: string, leadId: string, dto: CreateDealDto): Promise<Deal> {
    await this.assertLead(tenantId, leadId);
    if (dto.stage === "LOST" && !dto.lostReason) {
      throw new BadRequestException(
        "Quando o estágio for Perdido (LOST), informe o motivo da perda (lostReason)."
      );
    }
    if (dto.assignedUserId) {
      const member = await this.prisma.organizationMember.findFirst({
        where: {
          organizationId: tenantId,
          userId: dto.assignedUserId,
          status: "ACCEPTED",
        },
        select: { id: true },
      });
      if (!member) {
        throw new BadRequestException("Responsável inválido para esta organização.");
      }
    }
    const deal = await this.prisma.deal.create({
      data: {
        tenantId,
        leadId,
        assignedUserId: dto.assignedUserId ?? null,
        title: dto.title,
        value:
          dto.value !== undefined && dto.value !== null ? new Prisma.Decimal(dto.value) : undefined,
        stage: dto.stage ?? "NEW",
        temperature: dto.temperature,
        lastContactAt: dto.lastContactAt ? new Date(dto.lastContactAt) : undefined,
        nextActionAt: dto.nextActionAt ? new Date(dto.nextActionAt) : undefined,
        nextActionType: dto.nextActionType,
        lostReason: dto.lostReason,
      },
    });
    await this.leadActivityLog.append({
      tenantId,
      leadId,
      kind: "DEAL_CREATED",
      label: `Oportunidade criada: ${deal.title}`,
      meta: { dealId: deal.id },
      occurredAt: deal.createdAt,
    });
    return deal;
  }

  async findByLead(tenantId: string, leadId: string): Promise<Deal[]> {
    await this.assertLead(tenantId, leadId);
    return this.prisma.deal.findMany({
      where: { tenantId, leadId, ...soft },
      orderBy: { updatedAt: "desc" },
      include: {
        proposals: {
          where: soft,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            validUntil: true,
          },
        },
      },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Deal> {
    const deal = await this.prisma.deal.findFirst({
      where: { id, tenantId, ...soft },
      include: {
        lead: true,
        proposals: { where: soft, orderBy: { createdAt: "desc" } },
      },
    });
    if (!deal) throw new NotFoundException("Negociação não encontrada.");
    return deal;
  }

  async update(tenantId: string, id: string, dto: UpdateDealDto): Promise<Deal> {
    const existing = await this.prisma.deal.findFirst({
      where: { id, tenantId, ...soft },
    });
    if (!existing) throw new NotFoundException("Negociação não encontrada.");

    const stage = dto.stage ?? existing.stage;
    const lostReason = dto.lostReason !== undefined ? dto.lostReason : existing.lostReason;

    if (stage === "LOST" && !lostReason) {
      throw new BadRequestException(
        "Quando o estágio for Perdido (LOST), informe o motivo da perda (lostReason)."
      );
    }
    if (dto.assignedUserId) {
      const member = await this.prisma.organizationMember.findFirst({
        where: {
          organizationId: tenantId,
          userId: dto.assignedUserId,
          status: "ACCEPTED",
        },
        select: { id: true },
      });
      if (!member) {
        throw new BadRequestException("Responsável inválido para esta organização.");
      }
    }

    const data: Prisma.DealUpdateInput = {
      title: dto.title,
      stage: dto.stage,
      temperature: dto.temperature,
      lastContactAt:
        dto.lastContactAt === undefined
          ? undefined
          : dto.lastContactAt
            ? new Date(dto.lastContactAt)
            : null,
      nextActionAt:
        dto.nextActionAt === undefined
          ? undefined
          : dto.nextActionAt
            ? new Date(dto.nextActionAt)
            : null,
      nextActionType: dto.nextActionType,
    };

    if (dto.assignedUserId !== undefined) {
      data.assignedUser = dto.assignedUserId
        ? { connect: { id: dto.assignedUserId } }
        : { disconnect: true };
    }

    if (dto.value !== undefined) {
      data.value = dto.value === null ? null : new Prisma.Decimal(dto.value);
    }

    if (stage === "LOST") {
      data.lostReason = dto.lostReason ?? existing.lostReason;
    } else {
      data.lostReason = null;
    }

    const updated = await this.prisma.deal.update({
      where: { id },
      data,
    });

    if (stage !== existing.stage) {
      if (stage === "WON") {
        await this.stockReservation.commitForDeal(tenantId, id);
      } else if (stage === "LOST") {
        await this.stockReservation.releaseForDeal(tenantId, id);
      }
    }

    return updated;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.prisma.deal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async chatListOpenDealsForLead(tenantId: string, leadId: string) {
    await this.assertLead(tenantId, leadId);
    const deals = await this.prisma.deal.findMany({
      where: {
        tenantId,
        leadId,
        ...soft,
        stage: { notIn: ["WON", "LOST"] },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        stage: true,
        value: true,
        temperature: true,
        nextActionAt: true,
        nextActionType: true,
        updatedAt: true,
        _count: {
          select: {
            proposals: { where: { deletedAt: null } },
          },
        },
      },
    });
    return deals.map((d) => ({
      id: d.id,
      title: d.title,
      stage: d.stage,
      value: d.value != null ? String(d.value) : null,
      temperature: d.temperature,
      proposalCount: d._count.proposals,
      nextActionAt: d.nextActionAt?.toISOString() ?? null,
      nextActionType: d.nextActionType,
      updatedAt: d.updatedAt.toISOString(),
    }));
  }

  async getFocusSuggestion(deals: DealFocusItemDto[]): Promise<DealFocusSuggestion> {
    const apiKey = process.env["GEMINI_API_KEY"] ?? process.env["GOOGLE_GENERATIVE_AI_API_KEY"];
    if (!apiKey || deals.length === 0) {
      return this.focusFallback(deals);
    }
    try {
      const model = process.env["GEMINI_FOCUS_MODEL"] ?? "gemini-2.5-flash";
      const genAI = new GoogleGenerativeAI(apiKey);
      const genModel = genAI.getGenerativeModel({
        model,
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        systemInstruction:
          "Você é um assistente de CRM especializado em vendas de energia solar no Brasil. Responda APENAS com JSON válido.",
      });

      const list = deals
        .map(
          (d, i) =>
            `${i + 1}. id=${d.id} | cliente="${d.clientName}" | estágio=${d.stage} | valor=R$${d.value} | ${d.isOverdue ? `atrasado ${d.hoursOverdue}h` : `parado ${d.daysSinceUpdate}d`} | proposta=${d.proposalStatus}`
        )
        .join("\n");

      const result = await genModel.generateContent(
        `Analise as negociações abertas abaixo e retorne um JSON com:
- "summary": frase curta (máx 15 palavras) sobre o estado do pipeline
- "priorities": array ordenado por impacto × urgência, cada item com {dealId, rank, reason, why} onde:
  - reason: frase acionável de no máximo 10 palavras
  - why: 1-2 frases explicando o raciocínio (ex: "Vale R$45k e a proposta foi visualizada ontem — janela ideal para fechar.")
- "pattern": string com insight se houver padrão (ex: 3+ deals no mesmo estado) ou null

NEGOCIAÇÕES:
${list}`
      );

      const text = result.response.text().trim();
      const match = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : text) as DealFocusSuggestion;
      return parsed;
    } catch {}
    return this.focusFallback(deals);
  }

  private focusFallback(deals: DealFocusItemDto[]): DealFocusSuggestion {
    const sorted = [...deals].sort((a, b) => {
      const scoreA =
        (a.isOverdue ? 1000 : 0) + (a.proposalStatus === "viewed" ? 200 : 0) + a.value / 1000;
      const scoreB =
        (b.isOverdue ? 1000 : 0) + (b.proposalStatus === "viewed" ? 200 : 0) + b.value / 1000;
      return scoreB - scoreA;
    });
    return {
      summary: `${sorted.filter((d) => d.isOverdue).length} negociações atrasadas precisam de ação.`,
      priorities: sorted.slice(0, 3).map((d, i) => ({
        dealId: d.id,
        rank: i + 1,
        reason:
          d.proposalStatus === "viewed"
            ? "Proposta visualizada — fechar agora."
            : !d.proposalStatus || d.proposalStatus === "none"
              ? "Sem proposta — criar agora."
              : `Proposta sem resposta há ${d.daysSinceUpdate}d.`,
      })),
      pattern: null,
    };
  }

  async chatGetDealSummary(tenantId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, tenantId, ...soft },
      select: {
        id: true,
        title: true,
        stage: true,
        value: true,
        temperature: true,
        nextActionAt: true,
        nextActionType: true,
        lostReason: true,
        createdAt: true,
        updatedAt: true,
        lead: {
          select: { id: true, name: true, whatsapp: true, email: true },
        },
        proposals: {
          where: soft,
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            status: true,
            validUntil: true,
            createdAt: true,
            pdfUrl: true,
          },
        },
      },
    });
    if (!deal) throw new NotFoundException("Negociação não encontrada.");
    return {
      deal: {
        id: deal.id,
        title: deal.title,
        stage: deal.stage,
        value: deal.value != null ? String(deal.value) : null,
        temperature: deal.temperature,
        nextActionAt: deal.nextActionAt?.toISOString() ?? null,
        nextActionType: deal.nextActionType,
        lostReason: deal.lostReason,
        createdAt: deal.createdAt.toISOString(),
        updatedAt: deal.updatedAt.toISOString(),
        lead: deal.lead,
      },
      proposals: deal.proposals.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        validUntil: p.validUntil.toISOString(),
        createdAt: p.createdAt.toISOString(),
        hasPdf: Boolean(p.pdfUrl?.trim()),
        internalUrl: `/propostas/${p.id}`,
      })),
    };
  }
}
