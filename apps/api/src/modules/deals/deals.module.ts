import { Module } from "@nestjs/common";
import { LeadActivityLogModule } from "../lead-activity-log/lead-activity-log.module";
import { StockModule } from "../stock/stock.module";
import { DealsService } from "./deals.service";
import { DealsController } from "./deals.controller";
import { LeadDealsController } from "./lead-deals.controller";

@Module({
  imports: [LeadActivityLogModule, StockModule],
  controllers: [LeadDealsController, DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
