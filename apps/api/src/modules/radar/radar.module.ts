import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { LeadsModule } from "../leads/leads.module";
import { DealsModule } from "../deals/deals.module";
import { RadarController } from "./radar.controller";
import { RadarService } from "./radar.service";

@Module({
  imports: [PrismaModule, LeadsModule, DealsModule],
  controllers: [RadarController],
  providers: [RadarService],
  exports: [RadarService],
})
export class RadarModule {}
