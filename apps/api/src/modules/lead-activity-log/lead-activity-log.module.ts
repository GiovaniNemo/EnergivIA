import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { LeadActivityLogService } from "./lead-activity-log.service";

@Module({
  imports: [PrismaModule],
  providers: [LeadActivityLogService],
  exports: [LeadActivityLogService],
})
export class LeadActivityLogModule {}
