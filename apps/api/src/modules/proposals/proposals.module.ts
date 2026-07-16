import { Module } from "@nestjs/common";
import { LeadActivityLogModule } from "../lead-activity-log/lead-activity-log.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { StockModule } from "../stock/stock.module";
import { DealProposalsController } from "./deal-proposals.controller";
import { ProposalOperationsController } from "./proposal-operations.controller";
import { ProposalEquipmentController } from "./proposal-equipment.controller";
import { ProposalEquipmentService } from "./proposal-equipment.service";
import { ProposalsService } from "./proposals.service";
import { ProposalTemplatesController } from "./proposal-templates.controller";
import { ProposalTemplatesService } from "./proposal-templates.service";
import { PublicProposalsController } from "./public-proposals.controller";

@Module({
  imports: [NotificationsModule, LeadActivityLogModule, StockModule],
  controllers: [
    DealProposalsController,
    ProposalOperationsController,
    ProposalEquipmentController,
    ProposalTemplatesController,
    PublicProposalsController,
  ],
  providers: [ProposalsService, ProposalTemplatesService, ProposalEquipmentService],
  exports: [ProposalsService, ProposalTemplatesService],
})
export class ProposalsModule {}
