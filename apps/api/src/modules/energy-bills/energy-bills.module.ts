import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EnergyBillsController } from "./energy-bills.controller";
import { EnergyBillsService } from "./energy-bills.service";
import { AiUsageModule } from "../ai-usage/ai-usage.module";

@Module({
  imports: [ConfigModule, AiUsageModule],
  controllers: [EnergyBillsController],
  providers: [EnergyBillsService],
  exports: [EnergyBillsService],
})
export class EnergyBillsModule {}
