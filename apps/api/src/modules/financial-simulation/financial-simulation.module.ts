import { Module } from "@nestjs/common";
import { LeadActivityLogModule } from "../lead-activity-log/lead-activity-log.module";
import { SizingEngineModule } from "../sizing-engine/sizing-engine.module";
import { FinancialSimulationController } from "./financial-simulation.controller";
import { FinancialSimulationService } from "./financial-simulation.service";

@Module({
  imports: [SizingEngineModule, LeadActivityLogModule],
  controllers: [FinancialSimulationController],
  providers: [FinancialSimulationService],
  exports: [FinancialSimulationService],
})
export class FinancialSimulationModule {}
