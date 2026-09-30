import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { softDeleteWhere as soft } from "../../prisma/soft-delete";

export interface GlobalSearchDto {
  leads: Array<{
    id: string;
    name: string;
    whatsapp: string;
    email?: string | null;
    company?: string | null;
    cpfCnpj?: string | null;
    latestDealStage?: string | null;
    latestDealValue?: string | null;
    latestDealId?: string | null;
    latestDealTitle?: string | null;
    latestDealProposalCount?: number;
    updatedAt: string;
  }>;
  proposals: Array<{
    id: string;
    proposalNumber?: number | null;
    title: string;
    status: string;
    validUntil: string;
    quotedValueBrl?: number | null;
    createdAt: string;
    deal: {
      id: string;
      title: string;
      stage: string;
      lead: {
        id: string;
        name: string;
        whatsapp: string;
      };
    };
  }>;
  deals: Array<{
    id: string;
    title: string;
    stage: string;
    value?: string | null;
    temperature?: string | null;
    updatedAt: string;
    lead: {
      id: string;
      name: string;
      whatsapp: string;
      company?: string | null;
    };
  }>;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(
    tenantId: string,
    rawQuery: string,
    user?: { sub?: string; role?: string }
  ): Promise<GlobalSearchDto> {
    const trimmed = (rawQuery ?? "").trim();
    if (!trimmed) {
      return { leads: [], proposals: [], deals: [] };
    }

    const digits = trimmed.replace(/\D/g, "");
    const propNumber = digits.length > 0 && !isNaN(Number(digits)) ? Number(digits) : null;
    const isOwnerOrAdmin =
      user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "PLATFORM";

    // 1. Leads query: name, email, company, whatsapp, cpfCnpj, deals, proposals
    const leadOrConditions: Prisma.LeadWhereInput[] = [
      { name: { contains: trimmed, mode: "insensitive" } },
      { email: { contains: trimmed, mode: "insensitive" } },
      { company: { contains: trimmed, mode: "insensitive" } },
    ];
    if (digits.length > 0) {
      leadOrConditions.push({ whatsapp: { contains: digits } });
    }
    if (digits.length >= 3) {
      leadOrConditions.push({ cpfCnpj: { contains: digits } });
    }
    leadOrConditions.push({
      deals: {
        some: {
          ...soft,
          OR: [
            { title: { contains: trimmed, mode: "insensitive" } },
            {
              proposals: {
                some: {
                  ...soft,
                  OR: [
                    { title: { contains: trimmed, mode: "insensitive" } },
                    ...(propNumber !== null ? [{ proposalNumber: propNumber }] : []),
                  ],
                },
              },
            },
          ],
        },
      },
    });

    const leadWhere: Prisma.LeadWhereInput = {
      tenantId,
      ...soft,
      ...(!isOwnerOrAdmin && user?.sub
        ? {
            deals: {
              some: {
                assignedUserId: user.sub,
                ...soft,
              },
            },
          }
        : {}),
      OR: leadOrConditions,
    };

    // 2. Proposals query: title, proposalNumber, deal title, client name, client contact
    const proposalOrConditions: Prisma.ProposalWhereInput[] = [
      { title: { contains: trimmed, mode: "insensitive" } },
      { deal: { title: { contains: trimmed, mode: "insensitive" } } },
      { deal: { lead: { name: { contains: trimmed, mode: "insensitive" } } } },
      { deal: { lead: { email: { contains: trimmed, mode: "insensitive" } } } },
      { deal: { lead: { company: { contains: trimmed, mode: "insensitive" } } } },
    ];
    if (propNumber !== null) {
      proposalOrConditions.push({ proposalNumber: propNumber });
    }
    if (digits.length > 0) {
      proposalOrConditions.push({ deal: { lead: { whatsapp: { contains: digits } } } });
    }
    if (digits.length >= 3) {
      proposalOrConditions.push({ deal: { lead: { cpfCnpj: { contains: digits } } } });
    }

    const proposalWhere: Prisma.ProposalWhereInput = {
      tenantId,
      ...soft,
      ...(!isOwnerOrAdmin && user?.sub ? { deal: { assignedUserId: user.sub } } : {}),
      OR: proposalOrConditions,
    };

    // 3. Deals query: title, lead name, lead company
    const dealOrConditions: Prisma.DealWhereInput[] = [
      { title: { contains: trimmed, mode: "insensitive" } },
      { lead: { name: { contains: trimmed, mode: "insensitive" } } },
      { lead: { company: { contains: trimmed, mode: "insensitive" } } },
    ];
    if (digits.length > 0) {
      dealOrConditions.push({ lead: { whatsapp: { contains: digits } } });
    }

    const dealWhere: Prisma.DealWhereInput = {
      tenantId,
      ...soft,
      ...(!isOwnerOrAdmin && user?.sub ? { assignedUserId: user.sub } : {}),
      OR: dealOrConditions,
    };

    const [leadRows, proposalRows, dealRows] = await Promise.all([
      this.prisma.lead.findMany({
        where: leadWhere,
        take: 6,
        orderBy: { updatedAt: "desc" },
        include: {
          deals: {
            where: !isOwnerOrAdmin && user?.sub ? { ...soft, assignedUserId: user.sub } : soft,
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: {
              id: true,
              title: true,
              stage: true,
              value: true,
              _count: {
                select: { proposals: { where: soft } },
              },
            },
          },
        },
      }),
      this.prisma.proposal.findMany({
        where: proposalWhere,
        take: 6,
        orderBy: { updatedAt: "desc" },
        include: {
          deal: {
            include: {
              lead: {
                select: { id: true, name: true, whatsapp: true },
              },
            },
          },
          simulation: { select: { input: true } },
        },
      }),
      this.prisma.deal.findMany({
        where: dealWhere,
        take: 6,
        orderBy: { updatedAt: "desc" },
        include: {
          lead: {
            select: { id: true, name: true, whatsapp: true, company: true },
          },
        },
      }),
    ]);

    const leads = leadRows.map((lead) => {
      const latestDeal = lead.deals[0];
      return {
        id: lead.id,
        name: lead.name,
        whatsapp: lead.whatsapp,
        email: lead.email,
        company: lead.company,
        cpfCnpj: lead.cpfCnpj,
        latestDealStage: latestDeal?.stage ?? null,
        latestDealValue: latestDeal?.value != null ? latestDeal.value.toString() : null,
        latestDealId: latestDeal?.id ?? null,
        latestDealTitle: latestDeal?.title ?? null,
        latestDealProposalCount: latestDeal?._count.proposals ?? 0,
        updatedAt: lead.updatedAt.toISOString(),
      };
    });

    const proposals = proposalRows.map((p) => {
      let quotedValueBrl: number | null = null;
      if (p.renderedData && typeof p.renderedData === "object") {
        const rd = p.renderedData as Record<string, unknown>;
        const integ = rd["integrator"] as Record<string, unknown> | undefined;
        if (integ && typeof integ["quotedSaleBrl"] === "number") {
          quotedValueBrl = integ["quotedSaleBrl"];
        }
      }
      if (quotedValueBrl == null && p.simulation?.input && typeof p.simulation.input === "object") {
        const inp = p.simulation.input as Record<string, unknown>;
        if (typeof inp["investment"] === "number") {
          quotedValueBrl = inp["investment"];
        }
      }

      return {
        id: p.id,
        proposalNumber: p.proposalNumber,
        title: p.title,
        status: p.status,
        validUntil: p.validUntil.toISOString(),
        quotedValueBrl,
        createdAt: p.createdAt.toISOString(),
        deal: {
          id: p.deal.id,
          title: p.deal.title,
          stage: p.deal.stage,
          lead: {
            id: p.deal.lead.id,
            name: p.deal.lead.name,
            whatsapp: p.deal.lead.whatsapp,
          },
        },
      };
    });

    const deals = dealRows.map((d) => ({
      id: d.id,
      title: d.title,
      stage: d.stage,
      value: d.value != null ? d.value.toString() : null,
      temperature: d.temperature,
      updatedAt: d.updatedAt.toISOString(),
      lead: {
        id: d.lead.id,
        name: d.lead.name,
        whatsapp: d.lead.whatsapp,
        company: d.lead.company,
      },
    }));

    return { leads, proposals, deals };
  }
}
