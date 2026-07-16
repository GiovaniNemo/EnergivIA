import { Module } from "@nestjs/common";
import { LeadActivityLogModule } from "../lead-activity-log/lead-activity-log.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { WhatsappCoreModule } from "../whatsapp/whatsapp-core.module";
import { AdapterRegistry } from "./adapters/adapter.registry";
import { ApiProviderAdapter } from "./adapters/api-provider.adapter";
import { ManualProviderAdapter } from "./adapters/manual-provider.adapter";
import { FinancingApplicationsController } from "./financing-applications.controller";
import { FinancingApplicationsService } from "./financing-applications.service";
import { FinancingAuditLogService } from "./financing-audit-log.service";
import { FinancingCommissionRulesService } from "./financing-commission-rules.service";
import { FinancingCommissionsService } from "./financing-commissions.service";
import { FinancingDashboardController } from "./financing-dashboard.controller";
import { FinancingDashboardService } from "./financing-dashboard.service";
import { FinancingSlaService } from "./financing-sla.service";
import { FinancingPlatformController } from "./financing-platform.controller";
import { FinancingProvidersController } from "./financing-providers.controller";
import { FinancingProvidersService } from "./financing-providers.service";
import { FinancingSimulationController } from "./financing-simulation.controller";
import { FinancingSimulationService } from "./financing-simulation.service";

@Module({
  imports: [LeadActivityLogModule, NotificationsModule, WhatsappCoreModule],
  controllers: [
    FinancingSimulationController,
    FinancingProvidersController,
    FinancingApplicationsController,
    FinancingDashboardController,
    FinancingPlatformController,
  ],
  providers: [
    FinancingSimulationService,
    FinancingProvidersService,
    FinancingApplicationsService,
    FinancingCommissionsService,
    FinancingCommissionRulesService,
    FinancingAuditLogService,
    FinancingDashboardService,
    FinancingSlaService,
    ManualProviderAdapter,
    ApiProviderAdapter,
    AdapterRegistry,
  ],
  exports: [
    FinancingSimulationService,
    FinancingProvidersService,
    FinancingApplicationsService,
    FinancingCommissionsService,
    FinancingDashboardService,
  ],
})
export class FinancingModule {}
