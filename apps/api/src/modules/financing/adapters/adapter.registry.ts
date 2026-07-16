import { Injectable } from "@nestjs/common";
import type { FinancingProvider } from "@prisma/client";
import { ApiProviderAdapter } from "./api-provider.adapter";
import { ManualProviderAdapter } from "./manual-provider.adapter";
import type { FinancingProviderAdapter } from "../types/adapter.types";

@Injectable()
export class AdapterRegistry {
  constructor(
    private readonly manualAdapter: ManualProviderAdapter,
    private readonly apiAdapter: ApiProviderAdapter
  ) {}

  resolve(provider: FinancingProvider): FinancingProviderAdapter {
    switch (provider.mode) {
      case "API":
        return this.apiAdapter;
      case "ASSISTED":
      case "MANUAL":
      default:
        return this.manualAdapter;
    }
  }
}
