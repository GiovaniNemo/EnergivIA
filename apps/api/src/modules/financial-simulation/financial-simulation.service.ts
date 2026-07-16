import { Injectable } from "@nestjs/common";
import { LeadActivityLogService } from "../lead-activity-log/lead-activity-log.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SizingEngineService, type SizingInput } from "../sizing-engine/sizing-engine.service";

import { softDeleteWhere as soft } from "../../prisma/soft-delete";

export interface SimulationInput {
  systemSizeKw: number;
  investmentAmount: number;
  financingType: "CASH" | "FINANCED";
  interestRate?: number;
  installments?: number;
  energyPriceKwh?: number;
  annualIncreasePercent?: number;
  sizing?: SizingInput;
  solarResource?: unknown;
}

export interface SimulationResult {
  paybackYears: number;
  totalSavings25y: number;
  monthlySavings: number;
  annualSavings: number[];
  irr?: number;
  npv?: number;
}

@Injectable()
export class FinancialSimulationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sizingEngine: SizingEngineService,
    private readonly leadActivityLog: LeadActivityLogService
  ) {}

  simulate(input: SimulationInput): SimulationResult {
    const priceKwh = input.energyPriceKwh ?? 0.85;
    const kwhPerKwpMonth = 150;
    const monthlyProductionKwh = input.systemSizeKw * kwhPerKwpMonth;
    const monthlyConsumptionKwh = input.sizing?.monthlyConsumptionKwh;
    const compensableKwh =
      monthlyConsumptionKwh != null &&
      Number.isFinite(monthlyConsumptionKwh) &&
      monthlyConsumptionKwh > 0
        ? Math.min(monthlyProductionKwh, monthlyConsumptionKwh)
        : monthlyProductionKwh;
    let monthlySavings = compensableKwh * priceKwh;
    const monthlyRounded = Math.round(monthlySavings * 100) / 100;
    const annualNominal = Math.round(monthlyRounded * 12 * 100) / 100;
    const totalSavings25y = Math.round(annualNominal * 25 * 100) / 100;
    const annualSavings = Array.from({ length: 25 }, () => annualNominal);
    const paybackYears =
      input.investmentAmount <= 0
        ? 0
        : Math.ceil((input.investmentAmount / annualNominal) * 10) / 10;

    return {
      paybackYears,
      totalSavings25y,
      monthlySavings: monthlyRounded,
      annualSavings,
    };
  }

  async create(tenantId: string, leadId: string, input: SimulationInput, name?: string) {
    const result = this.simulate(input);
    const storedInput: Record<string, unknown> = { ...input };
    const storedResult: Record<string, unknown> = { ...result };
    if (input.sizing) {
      const sizingResult = this.sizingEngine.calculate(input.sizing);
      storedInput["sizing"] = input.sizing;
      storedResult["sizing"] = sizingResult;
    }
    const created = await this.prisma.simulation.create({
      data: {
        tenantId,
        leadId,
        input: storedInput as object,
        result: storedResult as object,
        name,
      },
    });
    const trimmedName = name?.trim();
    await this.leadActivityLog.append({
      tenantId,
      leadId,
      kind: "SIMULATION_ADDED",
      label: trimmedName ? `Simulação adicionada: ${trimmedName}` : "Simulação adicionada",
      meta: { simulationId: created.id },
      occurredAt: created.createdAt,
    });
    return created;
  }

  async findByLead(tenantId: string, leadId: string) {
    return this.prisma.simulation.findMany({
      where: { tenantId, leadId, ...soft },
      orderBy: { createdAt: "desc" },
    });
  }
}
