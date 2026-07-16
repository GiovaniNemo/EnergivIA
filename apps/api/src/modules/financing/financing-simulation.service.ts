import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { FinancingPersonType, FinancingProvider, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../../prisma/prisma.service";
import { softDeleteWhere as soft } from "../../prisma/soft-delete";
import { LeadActivityLogService } from "../lead-activity-log/lead-activity-log.service";
import { AdapterRegistry } from "./adapters/adapter.registry";
import { scoreOffer } from "./math/financing-math";
import type { CreateFinancingSimulationDto } from "./dto/create-simulation.dto";
import type { AdapterOffer } from "./types/adapter.types";

function inferPersonType(cpfCnpj: string | null | undefined): FinancingPersonType {
  if (!cpfCnpj) return "PF";
  const digits = cpfCnpj.replace(/\D/g, "");
  return digits.length === 14 ? "PJ" : "PF";
}

@Injectable()
export class FinancingSimulationService {
  private readonly logger = new Logger(FinancingSimulationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: AdapterRegistry,
    private readonly leadActivityLog: LeadActivityLogService
  ) {}

  async create(tenantId: string, userId: string | null, dto: CreateFinancingSimulationDto) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: dto.leadId, tenantId, ...soft },
    });
    if (!lead) throw new NotFoundException("Lead não encontrado.");

    if (dto.dealId) {
      const deal = await this.prisma.deal.findFirst({
        where: { id: dto.dealId, tenantId, leadId: lead.id, ...soft },
        select: { id: true },
      });
      if (!deal) throw new NotFoundException("Negociação não encontrada para este lead.");
    }

    const downPayment = dto.downPayment ?? 0;
    if (downPayment >= dto.projectAmount) {
      throw new BadRequestException("A entrada não pode ser maior ou igual ao valor do projeto.");
    }
    const financedAmount = Math.round((dto.projectAmount - downPayment) * 100) / 100;
    if (financedAmount < 500) {
      throw new BadRequestException(
        "Valor financiado muito baixo para uma simulação significativa."
      );
    }

    const personType = dto.personType ?? inferPersonType(dto.cpfCnpj ?? lead.cpfCnpj ?? null);

    const sim = await this.prisma.financingSimulation.create({
      data: {
        tenantId,
        leadId: lead.id,
        dealId: dto.dealId ?? null,
        customerName: dto.customerName,
        cpfCnpj: dto.cpfCnpj?.replace(/\D/g, "") ?? lead.cpfCnpj ?? null,
        email: dto.email ?? lead.email ?? null,
        phone: dto.phone ?? lead.whatsapp ?? null,
        personType,
        projectAmount: new Decimal(dto.projectAmount),
        downPayment: new Decimal(downPayment),
        financedAmount: new Decimal(financedAmount),
        requestedTerm: dto.requestedTerm,
        status: "PROCESSING",
        createdById: userId,
      },
    });

    const tenantOverrides = await this.prisma.tenantFinancingProvider.findMany({
      where: { tenantId },
      select: { providerId: true, active: true, apiConfig: true },
    });
    const overrideById = new Map(tenantOverrides.map((o) => [o.providerId, o]));

    const allProviders = await this.prisma.financingProvider.findMany({
      where: { active: true },
    });
    const eligibleProviders = allProviders.filter((p) => {
      const override = overrideById.get(p.id);
      if (override && !override.active) return false;
      if (personType === "PF" && !p.supportsPF) return false;
      if (personType === "PJ" && !p.supportsPJ) return false;
      return true;
    });

    if (eligibleProviders.length === 0) {
      await this.prisma.financingSimulation.update({
        where: { id: sim.id },
        data: { status: "ERROR", errorMessage: "Nenhum financiador elegível ativo." },
      });
      throw new BadRequestException("Nenhum financiador elegível ativo.");
    }

    const results = await Promise.all(
      eligibleProviders.map(async (provider) => {
        const adapter = this.adapters.resolve(provider);
        try {
          const result = await adapter.simulate(
            provider,
            {
              personType,
              cpfCnpj: sim.cpfCnpj,
              customerName: sim.customerName,
              email: sim.email,
              phone: sim.phone,
              projectAmount: dto.projectAmount,
              downPayment,
              financedAmount,
              requestedTerm: dto.requestedTerm,
              effectiveApiConfig: this.mergeApiConfig(
                provider,
                overrideById.get(provider.id)?.apiConfig as
                  | Record<string, unknown>
                  | null
                  | undefined
              ),
            },
            tenantId
          );
          return { provider, result };
        } catch (e) {
          this.logger.warn(
            `simulate falhou para provider=${provider.name}: ${e instanceof Error ? e.message : String(e)}`
          );
          return {
            provider,
            result: {
              ok: false as const,
              reason: e instanceof Error ? e.message : "Falha desconhecida",
            },
          };
        }
      })
    );

    const allOffers: Array<{ provider: FinancingProvider; offer: AdapterOffer }> = [];
    for (const r of results) {
      if (r.result.ok) {
        for (const offer of r.result.offers) {
          allOffers.push({ provider: r.provider, offer });
        }
      }
    }

    if (allOffers.length === 0) {
      const reasons = results
        .filter((r) => !r.result.ok)
        .map((r) => `${r.provider.name}: ${(r.result as { reason: string }).reason}`)
        .join(" | ");
      await this.prisma.financingSimulation.update({
        where: { id: sim.id },
        data: {
          status: "ERROR",
          errorMessage:
            reasons || "Nenhum financiador conseguiu calcular oferta para esses parâmetros.",
        },
      });
      throw new BadRequestException(
        "Nenhum financiador conseguiu calcular oferta para esses parâmetros."
      );
    }

    const minInstallment = Math.min(...allOffers.map((o) => o.offer.installmentValue));
    const minCet = Math.min(...allOffers.map((o) => o.offer.cet).filter((c) => c > 0));

    await this.prisma.$transaction(async (tx) => {
      for (const { provider, offer } of allOffers) {
        const score = scoreOffer(
          { installmentValue: offer.installmentValue, cetMonthly: offer.cet },
          { minInstallment, minCet: Number.isFinite(minCet) ? minCet : 0 }
        );
        await tx.financingOffer.create({
          data: {
            simulationId: sim.id,
            providerId: provider.id,
            rateTableId: offer.rateTableId ?? null,
            financedAmount: new Decimal(offer.financedAmount),
            term: offer.term,
            monthlyRate: new Decimal(offer.monthlyRate),
            cet: new Decimal(offer.cet),
            installmentValue: new Decimal(offer.installmentValue),
            totalAmount: new Decimal(offer.totalAmount),
            eligibilityStatus: offer.eligibilityStatus,
            score: new Decimal(score),
            notes: offer.notes ?? null,
            rawResponse: (offer.rawResponse as Prisma.InputJsonValue | undefined) ?? undefined,
          },
        });
      }
      await tx.financingSimulation.update({
        where: { id: sim.id },
        data: { status: "COMPLETED" },
      });
    });

    await this.leadActivityLog.append({
      tenantId,
      leadId: lead.id,
      kind: "SIMULATION_ADDED",
      label: `Simulação de financiamento criada (${allOffers.length} oferta(s))`,
      meta: { simulationId: sim.id, dealId: dto.dealId ?? null, kind: "financing" },
    });

    return this.findOne(tenantId, sim.id);
  }

  async findOne(tenantId: string, id: string) {
    const sim = await this.prisma.financingSimulation.findFirst({
      where: { id, tenantId },
      include: {
        offers: {
          include: {
            provider: { select: { id: true, name: true, slug: true, logoUrl: true, mode: true } },
          },
          orderBy: [{ installmentValue: "asc" }, { cet: "asc" }, { totalAmount: "asc" }],
        },
      },
    });
    if (!sim) throw new NotFoundException("Simulação não encontrada.");
    return sim;
  }

  async list(tenantId: string, params: { leadId?: string; dealId?: string; status?: string }) {
    return this.prisma.financingSimulation.findMany({
      where: {
        tenantId,
        ...(params.leadId ? { leadId: params.leadId } : {}),
        ...(params.dealId ? { dealId: params.dealId } : {}),
        ...(params.status
          ? { status: params.status as "DRAFT" | "PROCESSING" | "COMPLETED" | "ERROR" }
          : {}),
      },
      include: {
        offers: {
          select: { id: true, providerId: true, installmentValue: true, score: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  private mergeApiConfig(
    provider: FinancingProvider,
    tenantOverride: Record<string, unknown> | null | undefined
  ): Record<string, unknown> | null {
    const base = (provider.apiConfig as Record<string, unknown> | null) ?? null;
    if (!base && !tenantOverride) return null;
    return { ...(base ?? {}), ...(tenantOverride ?? {}) };
  }
}
