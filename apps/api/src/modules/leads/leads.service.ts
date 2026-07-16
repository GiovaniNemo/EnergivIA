import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DealStage, DealTemperature, Lead, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { getSkipTake, getPaginationMeta, parseOptionalCpfCnpj } from "@energivia/utils";
import type { PaginatedResponse } from "@energivia/types";
import type { CreateLeadDto } from "./dto/create-lead.dto";
import type { UpdateLeadDto } from "./dto/update-lead.dto";
import type { QueryLeadsDto } from "./dto/query-leads.dto";
import type { AppendLeadActivityDto } from "./dto/append-lead-activity.dto";
import { LeadActivityLogService } from "../lead-activity-log/lead-activity-log.service";
import { softDeleteWhere as soft } from "../../prisma/soft-delete";

function normalizeWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) {
    throw new BadRequestException("O WhatsApp deve ter pelo menos 10 dígitos.");
  }
  return digits;
}

function resolveOptionalCpfCnpj(raw: string | undefined): string | undefined {
  const parsed = parseOptionalCpfCnpj(raw);
  if (parsed === null) {
    throw new BadRequestException("CPF ou CNPJ inválido");
  }
  return parsed;
}

export type LeadListRow = Lead & {
  latestDealId: string | null;
  latestDealStage: DealStage | null;
  latestDealValue: string | null;
  latestDealProposalCount: number;
  latestDealProposalId: string | null;
  latestDealProposalStatus: string | null;
  latestDealProposalSentAt: Date | null;
  latestDealProposalClientViewedAt: Date | null;
  latestDealProposalClientViewCount: number;
  latestDealAssignedUserId: string | null;
  latestDealAssignedUserName: string | null;
  latestDealUpdatedAt: Date | null;
  latestDealTemperature: DealTemperature | null;
  nextActionAt: Date | null;
  nextActionType: string | null;
};

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadActivityLog: LeadActivityLogService
  ) {}

  async getDashboardStats(tenantId: string) {
    const [totalLeads, dealsInProposal, dealsInNegotiation, dealsWon] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId, ...soft } }),
      this.prisma.deal.count({ where: { tenantId, ...soft, stage: "PROPOSAL" } }),
      this.prisma.deal.count({ where: { tenantId, ...soft, stage: "NEGOTIATION" } }),
      this.prisma.deal.count({ where: { tenantId, ...soft, stage: "WON" } }),
    ]);
    return { totalLeads, dealsInProposal, dealsInNegotiation, dealsWon };
  }

  async create(tenantId: string, dto: CreateLeadDto): Promise<Lead> {
    const cpfCnpj = resolveOptionalCpfCnpj(dto.cpfCnpj);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const lead = await tx.lead.create({
          data: {
            tenantId,
            name: dto.name,
            whatsapp: normalizeWhatsapp(dto.whatsapp),
            cpfCnpj,
            email: dto.email,
            company: dto.company,
            source: dto.source,
          },
        });
        await tx.leadActivityLog.create({
          data: {
            tenantId,
            leadId: lead.id,
            kind: "LEAD_CREATED",
            label: "Cliente criado",
            occurredAt: lead.createdAt,
          },
        });
        return lead;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("Já existe um lead com este CPF/CNPJ nesta organização.");
      }
      throw e;
    }
  }

  async listActivity(tenantId: string, leadId: string) {
    await this.findOne(tenantId, leadId);
    const rows = await this.prisma.leadActivityLog.findMany({
      where: { tenantId, leadId },
      orderBy: { occurredAt: "desc" },
      select: { id: true, kind: true, label: true, occurredAt: true },
    });
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      label: r.label,
      occurredAt: r.occurredAt.toISOString(),
    }));
  }

  async appendActivity(tenantId: string, leadId: string, dto: AppendLeadActivityDto) {
    await this.findOne(tenantId, leadId);
    const text = dto.text.trim();
    const kind = dto.kind === "CALL" ? ("CALL_LOGGED" as const) : ("NOTE_ADDED" as const);
    const label = dto.kind === "CALL" ? `Ligação: ${text}` : `Nota: ${text}`;
    return this.leadActivityLog.append({
      tenantId,
      leadId,
      kind,
      label,
    });
  }

  async findAll(tenantId: string, query: QueryLeadsDto): Promise<PaginatedResponse<LeadListRow>> {
    const { skip, take } = getSkipTake(query.page ?? 1, query.pageSize ?? 20);

    const where: Prisma.LeadWhereInput = {
      tenantId,
      ...soft,
    };
    if (query.search) {
      const digits = query.search.replace(/\D/g, "");
      const or: Prisma.LeadWhereInput[] = [
        { name: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { company: { contains: query.search, mode: "insensitive" } },
      ];
      if (digits.length > 0) {
        or.push({ whatsapp: { contains: digits } });
      }
      if (digits.length === 11 || digits.length === 14) {
        or.push({ cpfCnpj: digits });
      }
      where.OR = or;
    }

    const [rows, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: "desc" },
        include: {
          deals: {
            where: soft,
            select: {
              id: true,
              stage: true,
              value: true,
              temperature: true,
              nextActionAt: true,
              nextActionType: true,
              updatedAt: true,
              assignedUserId: true,
              assignedUser: {
                select: { name: true },
              },
              _count: {
                select: {
                  proposals: { where: soft },
                },
              },
              proposals: {
                where: soft,
                take: 1,
                orderBy: { updatedAt: "desc" },
                select: {
                  id: true,
                  status: true,
                  sentAt: true,
                  clientLastViewedAt: true,
                  clientViewCount: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    const data: LeadListRow[] = rows.map((row) => {
      const { deals, ...lead } = row;
      const sorted = [...deals].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      const latest = sorted[0];
      const active = deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST");
      let nextActionAt: Date | null = null;
      let nextActionType: string | null = null;
      for (const d of active) {
        if (!d.nextActionAt) continue;
        if (!nextActionAt || d.nextActionAt.getTime() < nextActionAt.getTime()) {
          nextActionAt = d.nextActionAt;
          nextActionType = d.nextActionType;
        }
      }
      const latestVal = latest?.value;
      const latestProposal = latest?.proposals?.[0];
      return {
        ...lead,
        latestDealId: latest?.id ?? null,
        latestDealStage: latest?.stage ?? null,
        latestDealValue: latestVal != null ? String(latestVal) : null,
        latestDealProposalCount: latest?._count?.proposals ?? 0,
        latestDealProposalId: latestProposal?.id ?? null,
        latestDealProposalStatus: latestProposal?.status ?? null,
        latestDealProposalSentAt: latestProposal?.sentAt ?? null,
        latestDealProposalClientViewedAt: latestProposal?.clientLastViewedAt ?? null,
        latestDealProposalClientViewCount: latestProposal?.clientViewCount ?? 0,
        latestDealAssignedUserId: latest?.assignedUserId ?? null,
        latestDealAssignedUserName: latest?.assignedUser?.name ?? null,
        latestDealUpdatedAt: latest?.updatedAt ?? null,
        latestDealTemperature: latest?.temperature ?? null,
        nextActionAt,
        nextActionType,
      };
    });

    const meta = getPaginationMeta(total, query.page ?? 1, query.pageSize ?? 20);
    return { data, meta };
  }

  async findOne(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, ...soft },
      include: {
        deals: {
          where: soft,
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
                sentAt: true,
                pdfUrl: true,
                clientViewCount: true,
                clientFirstViewedAt: true,
                clientLastViewedAt: true,
                renderedData: true,
                simulation: {
                  select: { input: true, result: true },
                },
              },
            },
          },
        },
        energyBills: { where: soft, take: 5, orderBy: { createdAt: "desc" } },
      },
    });
    if (!lead) throw new NotFoundException("Lead não encontrado.");
    return lead;
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto): Promise<Lead> {
    await this.findOne(tenantId, id);

    let cpfCnpj: string | null | undefined = undefined;
    if (dto.cpfCnpj !== undefined) {
      const trimmed = dto.cpfCnpj?.trim();
      if (!trimmed) {
        cpfCnpj = null;
      } else {
        const parsed = parseOptionalCpfCnpj(trimmed);
        if (parsed === null) {
          throw new BadRequestException("CPF ou CNPJ inválido");
        }
        cpfCnpj = parsed;
      }
    }

    try {
      return await this.prisma.lead.update({
        where: { id },
        data: {
          name: dto.name,
          email: dto.email,
          whatsapp: dto.whatsapp !== undefined ? normalizeWhatsapp(dto.whatsapp) : undefined,
          company: dto.company,
          source: dto.source,
          ...(cpfCnpj !== undefined ? { cpfCnpj } : {}),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("Já existe um lead com este CPF/CNPJ nesta organização.");
      }
      throw e;
    }
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async chatSearchLeads(tenantId: string, search: string, limit?: number) {
    const q = search?.trim() ?? "";
    if (!q) {
      throw new BadRequestException(
        "Informe um texto para buscar (nome, e-mail, telefone ou empresa)."
      );
    }
    const capped = Math.min(Math.max(limit ?? 8, 1), 15);
    const { data } = await this.findAll(tenantId, {
      search: q,
      page: 1,
      pageSize: capped,
    } as QueryLeadsDto);
    return data.map((row) => ({
      id: row.id,
      name: row.name,
      whatsapp: row.whatsapp,
      email: row.email ?? null,
      company: row.company ?? null,
      source: row.source ?? null,
      latestDealId: row.latestDealId,
      latestDealStage: row.latestDealStage,
      latestDealValue: row.latestDealValue,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async chatGetLeadSummary(tenantId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId, ...soft },
      select: {
        id: true,
        name: true,
        whatsapp: true,
        email: true,
        company: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!lead) throw new NotFoundException("Lead não encontrado.");

    const deals = await this.prisma.deal.findMany({
      where: { tenantId, leadId, ...soft },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        stage: true,
        value: true,
        temperature: true,
        updatedAt: true,
        _count: {
          select: {
            proposals: { where: { deletedAt: null } },
          },
        },
      },
    });

    return {
      lead: {
        ...lead,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      },
      deals: deals.map((d) => ({
        id: d.id,
        title: d.title,
        stage: d.stage,
        value: d.value != null ? String(d.value) : null,
        temperature: d.temperature,
        proposalCount: d._count.proposals,
        updatedAt: d.updatedAt.toISOString(),
      })),
    };
  }
}
