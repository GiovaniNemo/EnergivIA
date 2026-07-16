import { Injectable, Logger } from "@nestjs/common";
import type { FinancingProvider } from "@prisma/client";
import type {
  AdapterApplicationInput,
  AdapterApplicationStatusResult,
  AdapterSimulationInput,
  AdapterSimulationResult,
  FinancingProviderAdapter,
} from "../types/adapter.types";

@Injectable()
export class ApiProviderAdapter implements FinancingProviderAdapter {
  private readonly logger = new Logger(ApiProviderAdapter.name);

  readonly mode = "API" as FinancingProvider["mode"];

  async simulate(
    provider: FinancingProvider,
    _input: AdapterSimulationInput
  ): Promise<AdapterSimulationResult> {
    this.logger.warn(
      `simulate(API) ainda não implementada para provider=${provider.name} — fallback para tabela manual.`
    );
    return {
      ok: false,
      reason:
        "Integração API ainda não disponível — provedor aceita apenas simulação manual via tabela.",
    };
  }

  async submitApplication(
    provider: FinancingProvider,
    input: AdapterApplicationInput
  ): Promise<{ externalReference: string | null; status: "CREATED" }> {
    this.logger.warn(
      `submitApplication(API) stub para provider=${provider.name} application=${input.applicationId}`
    );
    return { externalReference: null, status: "CREATED" };
  }

  async getApplicationStatus(
    provider: FinancingProvider,
    externalReference: string
  ): Promise<AdapterApplicationStatusResult> {
    this.logger.debug(
      `getApplicationStatus(API) stub provider=${provider.name} ref=${externalReference}`
    );
    return { status: "UNDER_REVIEW", externalReference };
  }
}
