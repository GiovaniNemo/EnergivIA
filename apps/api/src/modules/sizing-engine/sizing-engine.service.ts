import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

import { softDeleteWhere as soft } from "../../prisma/soft-delete";

export interface SizingInput {
  monthlyConsumptionKwh: number;
  roofAreaSqm?: number;
  panelEfficiency?: number;
  includeBattery?: boolean;
  autonomyHours?: number;
  billConsumptionHistoryKwh?: number[];
  billConsumptionHistoryLabeled?: Array<{ month: string; consumptionKwh: number }>;
  billReferenceMonth?: string;
}

export interface SizingResult {
  recommendedPowerKw: number;
  panelCount: number;
  inverterCount: number;
  estimatedProductionKwhMonth: number;
  batteryCapacityKwh?: number;
  batteryCount?: number;
  components?: Array<{ type: string; quantity: number; spec?: string }>;
}

@Injectable()
export class SizingEngineService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  calculate(input: SizingInput): SizingResult {
    const consumption = input.monthlyConsumptionKwh;
    const kwhPerKwMonth = 150;
    const recommendedPowerKw = Math.ceil((consumption / kwhPerKwMonth) * 1.1 * 10) / 10;
    const panelW = 550;
    const panelCount = Math.ceil((recommendedPowerKw * 1000) / panelW);
    const inverterCount = Math.max(1, Math.ceil(recommendedPowerKw / 5));
    const estimatedProductionKwhMonth = recommendedPowerKw * kwhPerKwMonth;

    const result: SizingResult = {
      recommendedPowerKw,
      panelCount,
      inverterCount,
      estimatedProductionKwhMonth,
      components: [
        { type: "panel", quantity: panelCount, spec: `${panelW}W` },
        {
          type: "inverter",
          quantity: inverterCount,
          spec: `${(recommendedPowerKw / inverterCount).toFixed(1)} kW`,
        },
      ],
    };

    if (input.includeBattery && input.autonomyHours) {
      const avgPowerKw = consumption / (30 * 24);
      const batteryCapacityKwh = Math.ceil(avgPowerKw * input.autonomyHours * 10) / 10;
      const batteryUnitKwh = 5;
      result.batteryCapacityKwh = batteryCapacityKwh;
      result.batteryCount = Math.ceil(batteryCapacityKwh / batteryUnitKwh);
      result.components?.push({
        type: "battery",
        quantity: result.batteryCount,
        spec: `${batteryUnitKwh} kWh`,
      });
    }

    return result;
  }

  async createSizing(
    tenantId: string,
    leadId: string,
    energyBillId: string | null,
    input: SizingInput,
    name?: string
  ) {
    const result = this.calculate(input);
    return this.prisma.systemSizing.create({
      data: {
        tenantId,
        leadId,
        energyBillId,
        input: input as object,
        result: result as object,
        name,
      },
    });
  }

  async findByLead(tenantId: string, leadId: string) {
    return this.prisma.systemSizing.findMany({
      where: { tenantId, leadId, ...soft },
      orderBy: { createdAt: "desc" },
    });
  }
}
