import { Module } from "@nestjs/common";
import { ChatbaseController } from "./chatbase.controller";
import { ChatbaseService } from "./chatbase.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { FinancialSimulationModule } from "../financial-simulation/financial-simulation.module";
import { ProposalsModule } from "../proposals/proposals.module";

@Module({
  imports: [PrismaModule, FinancialSimulationModule, ProposalsModule],
  controllers: [ChatbaseController],
  providers: [ChatbaseService],
})
export class ChatbaseModule {}
