import { Injectable, Logger } from "@nestjs/common";
import type { FinancingProvider, FinancingRateTable } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { calculateIof, cetMonthly, pmt, totalAmount } from "../math/financing-math";
import type {
  AdapterApplicationInput,
  AdapterApplicationStatusResult,
  AdapterOffer,
  AdapterSimulationInput,
  AdapterSimulationResult,
  FinancingProviderAdapter,
} from "../types/adapter.types";

@Injectable()
export class ManualProviderAdapter implements FinancingProviderAdapter {
  private readonly logger = new Logger(ManualProviderAdapter.name);

  readonly mode = "MANUAL" as FinancingProvider["mode"];

  constructor(private readonly prisma: PrismaService) {}

  async simulate(
    provider: FinancingProvider,
    input: AdapterSimulationInput,
    tenantId?: string | null
  ): Promise<AdapterSimulationResult> {
    if (input.personType === "PF" && !provider.supportsPF) {
      return { ok: false, reason: "Provider não opera com PF" };
    }
    if (input.personType === "PJ" && !provider.supportsPJ) {
      return { ok: false, reason: "Provider não opera com PJ" };
    }

    const rateTable = await this.findApplicableRateTable(provider.id, input, tenantId ?? null);
    if (!rateTable) {
      return {
        ok: false,
        reason: "Sem tabela de taxas aplicável (faixa de valor/prazo ou pessoa não atendida).",
      };
    }

    const principal = input.financedAmount;
    const term = input.requestedTerm;
    const monthlyRate = Number(rateTable.monthlyRate);
    const feeRate = Number(rateTable.feeRate ?? 0);
    const installment = pmt(principal, monthlyRate, term);
    const extraMonthlyFee = Math.round(principal * feeRate * 100) / 100;
    const iof = calculateIof(principal, term, input.personType);
    const cet = cetMonthly(principal, installment, term, extraMonthlyFee, iof);
    const total = Math.round((totalAmount(installment + extraMonthlyFee, term) + iof) * 100) / 100;

    const offer: AdapterOffer = {
      rateTableId: rateTable.id,
      financedAmount: principal,
      term,
      monthlyRate,
      cet,
      installmentValue: installment + extraMonthlyFee,
      totalAmount: total,
      eligibilityStatus: "ESTIMATED",
      notes:
        provider.mode === "ASSISTED"
          ? "Cotação estimada — sujeita a análise humana do parceiro."
          : "Cotação estimada pela tabela cadastrada.",
      rawResponse: {
        rateTableId: rateTable.id,
        source: "manual_rate_table",
        iof,
        feeRate,
        personType: input.personType,
      },
    };

    return { ok: true, offers: [offer] };
  }

  async submitApplication(
    _provider: FinancingProvider,
    input: AdapterApplicationInput
  ): Promise<{ externalReference: string | null; status: "CREATED" }> {
    this.logger.log(
      `submitApplication (manual) application=${input.applicationId} provider=${_provider.name}`
    );
    return { externalReference: null, status: "CREATED" };
  }

  async getApplicationStatus(
    _provider: FinancingProvider,
    _externalReference: string
  ): Promise<AdapterApplicationStatusResult> {
    return { status: "UNDER_REVIEW", externalReference: _externalReference };
  }

  private async findApplicableRateTable(
    providerId: string,
    input: AdapterSimulationInput,
    tenantId: string | null
  ): Promise<FinancingRateTable | null> {
    const now = new Date();
    const candidates = await this.prisma.financingRateTable.findMany({
      where: {
        providerId,
        active: true,
        personType: input.personType,
        minAmount: { lte: input.financedAmount },
        maxAmount: { gte: input.financedAmount },
        minTerm: { lte: input.requestedTerm },
        maxTerm: { gte: input.requestedTerm },
        AND: [
          {
            OR: [{ validFrom: null }, { validFrom: { lte: now } }],
          },
          {
            OR: [{ validUntil: null }, { validUntil: { gte: now } }],
          },
          tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : { tenantId: null },
        ],
      },
      orderBy: [{ tenantId: "desc" }, { monthlyRate: "asc" }],
    });
    return candidates[0] ?? null;
  }
}
