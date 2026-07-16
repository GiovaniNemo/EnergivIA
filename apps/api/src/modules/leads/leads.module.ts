import { Module } from "@nestjs/common";
import { LeadActivityLogModule } from "../lead-activity-log/lead-activity-log.module";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";

@Module({
  imports: [LeadActivityLogModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
